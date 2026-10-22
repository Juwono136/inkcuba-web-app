"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { WorkspaceDefaultBackground } from "@/components/lecturer/workspaces/workspace-form";
import { Button } from "@/components/ui/button";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TypedConfirmDialog } from "@/components/ui/typed-confirm-dialog";
import { WORKSPACE_SOFT_DELETE_RETENTION_DAYS } from "@/lib/workspaces/constants";
import type { WorkspaceListPage, WorkspaceRecord } from "@/lib/workspaces/types";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48] as const;

async function fetchTrash(params: {
  page: number;
  pageSize: number;
  q: string;
}): Promise<WorkspaceListPage> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    trash: "true",
  });
  if (params.q) search.set("q", params.q);

  const response = await fetch(`/api/lecturer/workspaces?${search}`);
  const payload = (await response.json()) as ApiEnvelope<WorkspaceListPage>;
  if (!payload.success) {
    throw new Error(payload.error?.message || "Failed to load trash");
  }
  return payload.data;
}

export function WorkspacesTrashClient() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [pendingHard, setPendingHard] = useState<WorkspaceRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [q]);

  const query = useQuery({
    queryKey: ["lecturer-workspaces-trash", page, pageSize, debouncedQ],
    queryFn: () => fetchTrash({ page, pageSize, q: debouncedQ }),
    placeholderData: (prev) => prev,
  });

  async function restore(item: WorkspaceRecord) {
    setBusyId(item.id);
    try {
      const response = await fetch(
        `/api/lecturer/workspaces/${item.id}/restore`,
        { method: "POST" },
      );
      const payload = (await response.json()) as ApiEnvelope<{
        workspace: WorkspaceRecord;
      }>;
      if (!payload.success) {
        throw new Error(payload.error?.message || "Restore failed");
      }
      toast.success("Workspace restored (Inactive — set Active when ready)");
      await queryClient.invalidateQueries({
        queryKey: ["lecturer-workspaces-trash"],
      });
      await queryClient.invalidateQueries({ queryKey: ["lecturer-workspaces"] });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to restore workspace",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function hardDelete() {
    if (!pendingHard) return;
    setBusyId(pendingHard.id);
    try {
      const response = await fetch(
        `/api/lecturer/workspaces/${pendingHard.id}?hard=true`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmName: pendingHard.name }),
        },
      );
      const payload = (await response.json()) as ApiEnvelope<{
        deleted: boolean;
      }>;
      if (!payload.success) {
        throw new Error(payload.error?.message || "Permanent delete failed");
      }
      toast.success("Workspace permanently deleted");
      setPendingHard(null);
      await queryClient.invalidateQueries({
        queryKey: ["lecturer-workspaces-trash"],
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete workspace",
      );
      throw error;
    } finally {
      setBusyId(null);
    }
  }

  const data = query.data;
  const hasResults = Boolean(data && data.items.length > 0);
  const from = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button asChild variant="outline" className="mb-3 border-slate-900">
            <Link href="/dashboard/lecturer/workspaces">
              <ArrowLeft className="h-4 w-4" />
              Back to workspaces
            </Link>
          </Button>
          <h1 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl">
            Workspace trash
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Soft-deleted workspaces stay here for{" "}
            {WORKSPACE_SOFT_DELETE_RETENTION_DAYS} days. Restore them, or
            permanently delete. Expired items are removed automatically.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-inkcuba-navy bg-white p-3 shadow-inkcuba sm:p-4">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search trash…"
            className="rounded-xl border-2 border-slate-900 bg-white pl-9"
            aria-label="Search trash"
          />
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <InkcubaLoader label="Loading trash…" />
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {query.error instanceof Error
            ? query.error.message
            : "Unable to load trash"}
        </div>
      ) : !hasResults ? (
        <div className="rounded-3xl border-2 border-dashed border-inkcuba-navy bg-white px-6 py-16 text-center shadow-inkcuba">
          <Trash2 className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <p className="font-heading font-bold text-slate-900">Trash is empty</p>
          <p className="mt-1 text-sm text-slate-600">
            {debouncedQ
              ? "No trashed workspaces match your search."
              : "Soft-deleted workspaces will appear here."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data!.items.map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.24) }}
                className="overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba"
              >
                <div className="relative aspect-[2.2/1] w-full overflow-hidden opacity-80">
                  {item.backgroundImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.backgroundImageUrl}
                      alt=""
                      className="h-full w-full object-cover grayscale"
                    />
                  ) : (
                    <WorkspaceDefaultBackground
                      compact
                      className="h-full w-full grayscale"
                    />
                  )}
                  <span className="absolute top-3 right-3 rounded-full border border-slate-400 bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-700 uppercase">
                    In trash
                  </span>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="font-heading text-base font-bold text-slate-900">
                      {item.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {item.className} · {item.semesterLabel}
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      {item.daysUntilPurge == null
                        ? "Pending purge"
                        : item.daysUntilPurge === 0
                          ? "Purge imminent"
                          : `${item.daysUntilPurge} day${item.daysUntilPurge === 1 ? "" : "s"} until auto-delete`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-900"
                      disabled={busyId === item.id}
                      onClick={() => void restore(item)}
                    >
                      {busyId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      Restore
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      disabled={busyId === item.id}
                      onClick={() => setPendingHard(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete forever
                    </Button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-center text-xs text-slate-600 sm:text-left sm:text-sm">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {from}–{to}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">{data!.total}</span>
              {debouncedQ ? " (filtered)" : ""}
            </p>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[6.75rem] shrink-0 rounded-xl border-2 border-slate-900 sm:w-[7.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-900 px-2 sm:px-3"
                  disabled={data!.page <= 1}
                  aria-label="Previous page"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Prev</span>
                </Button>
                <span className="min-w-[3.5rem] text-center text-xs font-semibold text-slate-700 sm:min-w-[4.5rem]">
                  {data!.page} / {data!.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-900 px-2 sm:px-3"
                  disabled={data!.page >= data!.totalPages}
                  aria-label="Next page"
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(data?.totalPages ?? prev, prev + 1),
                    )
                  }
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <TypedConfirmDialog
        open={Boolean(pendingHard)}
        onOpenChange={(open) => {
          if (!open) setPendingHard(null);
        }}
        title="Permanently delete workspace?"
        description="This removes the workspace and its files from storage permanently. This cannot be undone."
        confirmPhrase={pendingHard?.name ?? ""}
        confirmPhraseLabel="Type the workspace name to confirm"
        confirmLabel="Delete forever"
        variant="destructive"
        loading={busyId === pendingHard?.id}
        onConfirm={hardDelete}
      />
    </motion.div>
  );
}
