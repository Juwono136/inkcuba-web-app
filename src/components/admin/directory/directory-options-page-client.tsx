"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Reorder, useDragControls } from "framer-motion";
import {
  GripVertical,
  ListTree,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DIRECTORY_OPTION_CATEGORIES,
  DIRECTORY_OPTION_CATEGORY_LABELS,
  DIRECTORY_OPTION_DEFAULT_PAGE_SIZE,
  DIRECTORY_OPTION_PAGE_SIZE_OPTIONS,
  type DirectoryOptionCategory,
  type DirectoryOptionListPage,
  type DirectoryOptionRecord,
} from "@/lib/directory/types";
import { cn } from "@/lib/utils";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

const QUERY_KEY = "admin-directory-options";
const SEARCH_DEBOUNCE_MS = 300;

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!payload.success) {
    throw new Error(payload.error?.message || "Request failed");
  }
  return payload.data;
}

async function fetchDirectoryPage(params: {
  category: DirectoryOptionCategory;
  q: string;
  page: number;
  pageSize: number;
}): Promise<DirectoryOptionListPage> {
  const search = new URLSearchParams({
    category: params.category,
    q: params.q,
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  return readJson<DirectoryOptionListPage>(
    await fetch(`/api/admin/directory-options?${search.toString()}`, {
      cache: "no-store",
    }),
  );
}

type OptionFormState = {
  label: string;
  isActive: boolean;
};

function emptyForm(): OptionFormState {
  return { label: "", isActive: true };
}

function formFromOption(option: DirectoryOptionRecord): OptionFormState {
  return {
    label: option.label,
    isActive: option.isActive,
  };
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase",
        active
          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
          : "border-slate-400 bg-slate-100 text-slate-600",
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/** Shared desktop/tablet column track — header + rows must match exactly. */
const DESKTOP_ROW_GRID =
  "md:grid-cols-[2.5rem_minmax(0,1fr)_7rem_12rem] md:gap-x-3";

function OptionRowActions({
  option,
  disabled,
  onEdit,
  onDelete,
  compact = false,
}: {
  option: DirectoryOptionRecord;
  disabled?: boolean;
  onEdit: (option: DirectoryOptionRecord) => void;
  onDelete: (option: DirectoryOptionRecord) => void;
  /** Icon-only buttons for tight mobile layouts */
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", !compact && "sm:gap-2")}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn(
          "border-inkcuba-navy",
          compact && "h-9 w-9 px-0",
        )}
        disabled={disabled}
        onClick={() => onEdit(option)}
        aria-label={compact ? `Edit ${option.label}` : undefined}
        title="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
        {!compact ? <span>Edit</span> : null}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn(
          "border-red-600 text-red-700 hover:bg-red-50",
          compact && "h-9 w-9 px-0",
        )}
        disabled={disabled}
        onClick={() => onDelete(option)}
        aria-label={compact ? `Delete ${option.label}` : undefined}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {!compact ? <span>Delete</span> : null}
      </Button>
    </div>
  );
}

function DragHandle({
  label,
  canReorder,
  busy,
  onPointerDown,
  className,
}: {
  label: string;
  canReorder: boolean;
  busy: boolean;
  onPointerDown: (event: ReactPointerEvent) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Reorder ${label}`}
      disabled={!canReorder || busy}
      onPointerDown={onPointerDown}
      className={cn(
        "inline-flex shrink-0 touch-none items-center justify-center rounded-lg text-slate-400",
        canReorder && !busy
          ? "cursor-grab active:cursor-grabbing hover:bg-slate-100 hover:text-slate-700"
          : "cursor-not-allowed opacity-35",
        className,
      )}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

function OptionFormDialog({
  open,
  onOpenChange,
  mode,
  category,
  initial,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  category: DirectoryOptionCategory;
  initial: OptionFormState;
  onSubmit: (values: OptionFormState) => Promise<void>;
  submitting: boolean;
}) {
  // Parent remounts this dialog via `key` when opening create/edit so form state resets.
  const [form, setForm] = useState<OptionFormState>(initial);
  const categoryLabel = DIRECTORY_OPTION_CATEGORY_LABELS[category];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const label = form.label.trim();
    if (!label) {
      toast.error("Label is required");
      return;
    }
    await onSubmit({ ...form, label });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!submitting}
        className="border-2 border-slate-900 shadow-inkcuba sm:max-w-md"
      >
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-slate-900">
              {mode === "create" ? "Add option" : "Edit option"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-600">
              {mode === "create"
                ? `Create a new ${categoryLabel.toLowerCase()} entry for profiles and forms.`
                : `Update this ${categoryLabel.toLowerCase()} entry.`}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="directory-option-label">Label</Label>
              <Input
                id="directory-option-label"
                value={form.label}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, label: event.target.value }))
                }
                placeholder="Display name"
                className="rounded-xl border-2 border-slate-300"
                disabled={submitting}
                maxLength={120}
                required
                autoFocus
              />
              {mode === "create" ? (
                <p className="text-xs text-slate-500">
                  The stored value is generated automatically from the label.
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-slate-50/80 px-3 py-3">
              <Checkbox
                id="directory-option-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    isActive: checked === true,
                  }))
                }
                disabled={submitting}
              />
              <Label
                htmlFor="directory-option-active"
                className="cursor-pointer font-normal text-slate-700"
              >
                Active (visible in public directory lists)
              </Label>
            </div>
          </div>

          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="w-full border-slate-900 sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-sky-500 shadow-inkcuba hover:bg-sky-600 sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : mode === "create" ? (
                "Add option"
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DirectoryOptionRow({
  option,
  canReorder,
  busy,
  onEdit,
  onDelete,
  onDragEnd,
}: {
  option: DirectoryOptionRecord;
  canReorder: boolean;
  busy: boolean;
  onEdit: (option: DirectoryOptionRecord) => void;
  onDelete: (option: DirectoryOptionRecord) => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();

  function startDrag(event: ReactPointerEvent) {
    if (!canReorder || busy) return;
    controls.start(event);
  }

  return (
    <Reorder.Item
      value={option}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className={cn(
        // Mobile: spaced cards. Desktop: flat table rows.
        "bg-white md:border-b md:border-slate-100 md:last:border-b-0",
        "rounded-xl border-2 border-slate-200 shadow-sm md:rounded-none md:border-0 md:shadow-none",
        busy && "opacity-70",
      )}
    >
      {/* Mobile / small tablet card */}
      <div className="flex items-stretch gap-2 p-3 md:hidden">
        <DragHandle
          label={option.label}
          canReorder={canReorder}
          busy={busy}
          onPointerDown={startDrag}
          className="h-auto min-h-11 w-9 self-stretch border border-slate-200 bg-slate-50"
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="break-words text-sm leading-snug font-semibold text-slate-900">
              {option.label}
            </p>
            <StatusBadge active={option.isActive} />
          </div>
          <OptionRowActions
            option={option}
            disabled={busy}
            onEdit={onEdit}
            onDelete={onDelete}
            compact
          />
        </div>
      </div>

      {/* Desktop / tablet table row — same tracks as header */}
      <div
        className={cn(
          "hidden items-center px-4 py-3 transition-colors hover:bg-sky-50/60 sm:px-5 md:grid",
          DESKTOP_ROW_GRID,
        )}
      >
        <DragHandle
          label={option.label}
          canReorder={canReorder}
          busy={busy}
          onPointerDown={startDrag}
          className="h-8 w-8"
        />
        <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
          {option.label}
        </p>
        <div className="flex items-center">
          <StatusBadge active={option.isActive} />
        </div>
        <div className="flex justify-end">
          <OptionRowActions
            option={option}
            disabled={busy}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>
    </Reorder.Item>
  );
}

function EmptyState({
  categoryLabel,
  searching,
  onAdd,
}: {
  categoryLabel: string;
  searching: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="px-4 py-16 sm:px-5">
      <div className="mx-auto max-w-sm text-center">
        <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-sky-50 text-inkcuba-cyan">
          <ListTree className="h-6 w-6" />
        </span>
        <p className="font-heading text-base font-bold text-slate-900">
          {searching ? "No matches" : "No options yet"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {searching
            ? "Try a different search term."
            : `Add the first ${categoryLabel.toLowerCase()} value for forms and profiles.`}
        </p>
        {!searching ? (
          <Button
            type="button"
            className="mt-4 border-2 border-inkcuba-navy bg-sky-500 shadow-inkcuba hover:bg-sky-600"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4" />
            Add option
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function DirectoryOptionsPageClient() {
  const queryClient = useQueryClient();
  const [category, setCategory] =
    useState<DirectoryOptionCategory>("campus");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DIRECTORY_OPTION_DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formInitial, setFormInitial] = useState<OptionFormState>(emptyForm());
  const [formKey, setFormKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirectoryOptionRecord | null>(
    null,
  );
  const [localItems, setLocalItems] = useState<DirectoryOptionRecord[]>([]);
  const [syncedListKey, setSyncedListKey] = useState("");
  const [reorderBaseline, setReorderBaseline] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const listParams = {
    category,
    q: debouncedSearch,
    page,
    pageSize,
  };

  const canReorder = debouncedSearch.length === 0;

  const query = useQuery({
    queryKey: [QUERY_KEY, listParams],
    queryFn: async () => {
      try {
        return await fetchDirectoryPage(listParams);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load options",
        );
        throw error;
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: OptionFormState) => {
      return readJson<{ option: DirectoryOptionRecord }>(
        await fetch("/api/admin/directory-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            label: values.label.trim(),
            isActive: values.isActive,
          }),
        }),
      );
    },
    onSuccess: () => {
      toast.success("Option added");
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ["directory-options"] });
      setFormOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Create failed");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: OptionFormState;
    }) => {
      return readJson<{ option: DirectoryOptionRecord }>(
        await fetch(`/api/admin/directory-options/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: values.label.trim(),
            isActive: values.isActive,
          }),
        }),
      );
    },
    onSuccess: () => {
      toast.success("Option updated");
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ["directory-options"] });
      setFormOpen(false);
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Update failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await readJson(
        await fetch(`/api/admin/directory-options/${id}`, {
          method: "DELETE",
        }),
      );
    },
    onSuccess: () => {
      toast.success("Option removed");
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ["directory-options"] });
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      return readJson<{ updated: number }>(
        await fetch("/api/admin/directory-options/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, orderedIds }),
        }),
      );
    },
    onSuccess: (result) => {
      if (result.updated > 0) {
        toast.success("Order updated");
      }
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: ["directory-options"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Reorder failed");
      const fallback = query.data?.items ?? [];
      setLocalItems(fallback);
      setSyncedListKey(
        `${category}|${debouncedSearch}|${page}|${pageSize}|${fallback
          .map(
            (item) =>
              `${item.id}:${item.label}:${item.isActive}:${item.sortOrder}`,
          )
          .join(",")}`,
      );
      setReorderBaseline(fallback.map((item) => item.id).join(","));
    },
  });

  const serverItems = query.data?.items ?? [];
  const listSyncKey = `${category}|${debouncedSearch}|${page}|${pageSize}|${serverItems
    .map((item) => `${item.id}:${item.label}:${item.isActive}:${item.sortOrder}`)
    .join(",")}`;

  // Sync server page into local drag state during render when the query result changes.
  if (listSyncKey !== syncedListKey && !reorderMutation.isPending) {
    setSyncedListKey(listSyncKey);
    setLocalItems(serverItems);
    setReorderBaseline(serverItems.map((item) => item.id).join(","));
  }

  const data = query.data ?? null;
  const loading = query.isFetching;
  const items = localItems;
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const formSubmitting = createMutation.isPending || updateMutation.isPending;
  const busy =
    formSubmitting ||
    deleteMutation.isPending ||
    reorderMutation.isPending;
  const categoryLabel = DIRECTORY_OPTION_CATEGORY_LABELS[category];

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setFormInitial(emptyForm());
    setFormKey((key) => key + 1);
    setFormOpen(true);
  }

  function openEdit(option: DirectoryOptionRecord) {
    setFormMode("edit");
    setEditingId(option.id);
    setFormInitial(formFromOption(option));
    setFormKey((key) => key + 1);
    setFormOpen(true);
  }

  async function handleFormSubmit(values: OptionFormState) {
    if (formMode === "create") {
      await createMutation.mutateAsync(values);
    } else if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, values });
    }
  }

  function handleCategoryChange(next: DirectoryOptionCategory) {
    setCategory(next);
    setPage(1);
    setSearchInput("");
    setDebouncedSearch("");
  }

  function handleReorder(next: DirectoryOptionRecord[]) {
    if (!canReorder || reorderMutation.isPending) return;
    setLocalItems(next);
  }

  function commitReorder() {
    if (!canReorder || reorderMutation.isPending) return;
    const orderedIds = localItems.map((item) => item.id);
    const signature = orderedIds.join(",");
    if (signature === reorderBaseline) return;
    setReorderBaseline(signature);
    void reorderMutation.mutateAsync(orderedIds);
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba">
        <div className="flex flex-col gap-3 border-b-2 border-inkcuba-navy bg-gradient-to-r from-sky-100 via-violet-100 to-amber-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-white text-inkcuba-cyan">
              <ListTree className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-wide text-inkcuba-navy uppercase">
                Directory
              </p>
              <p className="truncate font-heading text-lg font-bold text-slate-900">
                {categoryLabel} options
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              type="button"
              className="border-2 border-inkcuba-navy bg-sky-500 shadow-inkcuba hover:bg-sky-600"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              <span className="truncate">Add option</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-2 border-inkcuba-navy"
              onClick={() => void query.refetch()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="space-y-3 border-b border-slate-200 bg-slate-50/80 p-4 sm:px-5">
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                Category
              </p>
              <p className="text-xs text-slate-500 sm:hidden">
                {total === 1 ? "1 option" : `${total} options`}
                {debouncedSearch ? " · filtered" : ""}
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="hidden flex-wrap gap-2 sm:flex">
                {DIRECTORY_OPTION_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={cn(
                      "rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors",
                      category === cat
                        ? "border-inkcuba-navy bg-white text-slate-900 shadow-inkcuba"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900",
                    )}
                  >
                    {DIRECTORY_OPTION_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              <Select
                value={category}
                onValueChange={(value) =>
                  handleCategoryChange(value as DirectoryOptionCategory)
                }
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-2 border-slate-300 bg-white sm:hidden">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTORY_OPTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {DIRECTORY_OPTION_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="hidden text-xs text-slate-500 sm:block lg:text-right">
                {total === 1 ? "1 option" : `${total} options`} in this category
                {debouncedSearch ? " (filtered)" : ""}
              </p>
            </div>
          </div>

          <div className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={`Search ${categoryLabel.toLowerCase()}…`}
              className="h-10 w-full rounded-xl border-2 border-slate-300 bg-white pl-9 sm:max-w-md"
              aria-label={`Search ${categoryLabel} options`}
            />
          </div>

          {canReorder ? (
            <p className="text-xs leading-relaxed text-slate-500">
              Drag the grip handle to reorder. New options are added at the end.
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-amber-800">
              Clear search to reorder options with drag and drop.
            </p>
          )}
        </div>

        {/* Desktop column headers — same tracks as rows (no sr-only: it breaks grid). */}
        <div
          className={cn(
            "hidden border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 text-[11px] font-bold tracking-wide text-slate-500 uppercase sm:px-5 md:grid",
            DESKTOP_ROW_GRID,
          )}
        >
          <span aria-hidden="true" />
          <span className="min-w-0">Label</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {query.isLoading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-slate-500 sm:px-5">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading options…
          </div>
        ) : null}

        {!query.isLoading && items.length === 0 ? (
          <EmptyState
            categoryLabel={categoryLabel}
            searching={Boolean(debouncedSearch)}
            onAdd={openCreate}
          />
        ) : null}

        {!query.isLoading && items.length > 0 ? (
          <Reorder.Group
            axis="y"
            values={items}
            onReorder={handleReorder}
            className="list-none space-y-2.5 bg-slate-50/40 p-3 md:space-y-0 md:bg-transparent md:p-0"
          >
            {items.map((option) => (
              <DirectoryOptionRow
                key={option.id}
                option={option}
                canReorder={canReorder}
                busy={busy}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onDragEnd={commitReorder}
              />
            ))}
          </Reorder.Group>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500">
            {total === 0
              ? "0 options"
              : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[7.5rem] rounded-xl border-2 border-slate-300 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTORY_OPTION_PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-900"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <span className="min-w-[4.5rem] text-center text-xs font-semibold text-slate-600">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-900"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <OptionFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        category={category}
        initial={formInitial}
        onSubmit={handleFormSubmit}
        submitting={formSubmitting}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete directory option?"
        description={
          deleteTarget
            ? `Remove “${deleteTarget.label}” from ${DIRECTORY_OPTION_CATEGORY_LABELS[deleteTarget.category].toLowerCase()} options. Existing profile data is not changed, but this value will no longer be offered in forms.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMutation.mutateAsync(deleteTarget.id);
        }}
      />
    </div>
  );
}
