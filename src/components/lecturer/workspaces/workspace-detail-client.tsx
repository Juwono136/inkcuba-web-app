"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Award,
  FileUp,
  Info,
  Loader2,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  WorkspaceDefaultBackground,
  WorkspaceForm,
  type WorkspaceFormValues,
} from "@/components/lecturer/workspaces/workspace-form";
import { WorkspacePeopleTab } from "@/components/lecturer/workspaces/people/workspace-people-tab";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import { resolveUserImageUrl } from "@/lib/media/resolve-avatar-url";
import { cn } from "@/lib/utils";
import type { WorkspaceDetail, WorkspaceStatus } from "@/lib/workspaces/types";
import {
  WORKSPACE_STATUS_HINTS,
  WORKSPACE_STATUS_LABELS,
} from "@/lib/workspaces/types";
import { useUiStore } from "@/stores/ui-store";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

type TabId = "info" | "people" | "submission" | "scoring";

const TAB_IDS: TabId[] = ["info", "people", "submission", "scoring"];

function parseTabId(value: string | null | undefined): TabId {
  if (value && TAB_IDS.includes(value as TabId)) {
    return value as TabId;
  }
  return "info";
}

type PendingSave = {
  values: WorkspaceFormValues;
  backgroundFile: File | null;
  clearBackground: boolean;
};

function statusBadgeClass(status: WorkspaceStatus): string {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "DRAFT":
      return "border-amber-300 bg-amber-50 text-amber-900";
    case "INACTIVE":
      return "border-slate-300 bg-slate-50 text-slate-600";
  }
}

const TABS: {
  id: TabId;
  label: string;
  icon: typeof Info;
}[] = [
  { id: "info", label: "Info", icon: Info },
  { id: "people", label: "People", icon: Users },
  { id: "submission", label: "Submission", icon: FileUp },
  { id: "scoring", label: "Scoring", icon: Award },
];

async function fetchWorkspace(id: string): Promise<WorkspaceDetail> {
  const response = await fetch(`/api/lecturer/workspaces/${id}`);
  const payload = (await response.json()) as ApiEnvelope<{
    workspace: WorkspaceDetail;
  }>;
  if (!payload.success) {
    throw new Error(payload.error?.message || "Failed to load workspace");
  }
  return payload.data.workspace;
}

export function WorkspaceDetailClient({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setActiveWorkspaceId = useUiStore((s) => s.setActiveWorkspaceId);
  const tab = parseTabId(searchParams.get("tab"));
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);

  function setTab(next: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "info") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const query = useQuery({
    queryKey: ["lecturer-workspace", workspaceId],
    queryFn: () => fetchWorkspace(workspaceId),
  });

  useEffect(() => {
    setActiveWorkspaceId(workspaceId);
    return () => setActiveWorkspaceId(null);
  }, [workspaceId, setActiveWorkspaceId]);

  async function persistUpdate(input: PendingSave) {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/lecturer/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.values.name,
          className: input.values.className,
          semester: input.values.semester,
          description: input.values.description || null,
          status: input.values.status,
        }),
      });
      const payload = (await response.json()) as ApiEnvelope<{
        workspace: WorkspaceDetail;
      }>;
      if (!payload.success) {
        throw new Error(payload.error?.message || "Failed to update workspace");
      }

      if (input.backgroundFile) {
        const form = new FormData();
        form.append("file", input.backgroundFile);
        const bgResponse = await fetch(
          `/api/lecturer/workspaces/${workspaceId}/background`,
          { method: "POST", body: form },
        );
        const bgPayload = (await bgResponse.json()) as ApiEnvelope<{
          workspace: WorkspaceDetail;
        }>;
        if (!bgPayload.success) {
          throw new Error(
            bgPayload.error?.message || "Failed to update background",
          );
        }
      } else if (input.clearBackground) {
        const bgResponse = await fetch(
          `/api/lecturer/workspaces/${workspaceId}/background`,
          { method: "DELETE" },
        );
        const bgPayload = (await bgResponse.json()) as ApiEnvelope<{
          workspace: WorkspaceDetail;
        }>;
        if (!bgPayload.success) {
          throw new Error(
            bgPayload.error?.message || "Failed to remove background",
          );
        }
      }

      toast.success("Workspace updated");
      setEditOpen(false);
      setPendingSave(null);
      await queryClient.invalidateQueries({
        queryKey: ["lecturer-workspace", workspaceId],
      });
      await queryClient.invalidateQueries({ queryKey: ["lecturer-workspaces"] });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update workspace",
      );
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const response = await fetch(`/api/lecturer/workspaces/${workspaceId}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as ApiEnvelope<{ deleted: boolean }>;
    if (!payload.success) {
      toast.error(payload.error?.message || "Failed to delete workspace");
      throw new Error(payload.error?.message || "Delete failed");
    }
    toast.success("Workspace deleted");
    await queryClient.invalidateQueries({ queryKey: ["lecturer-workspaces"] });
    router.push("/dashboard/lecturer/workspaces");
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-inkcuba-cyan" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        {(query.error as Error | null)?.message ||
          "Workspace not found or inaccessible."}{" "}
        <Link
          href="/dashboard/lecturer/workspaces"
          className="font-semibold underline"
        >
          Back to workspaces
        </Link>
      </div>
    );
  }

  const workspace = query.data;
  const lecturerImage = resolveUserImageUrl(workspace.lecturer.image);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba">
        <div className="relative h-36 w-full overflow-hidden sm:h-44">
          {workspace.backgroundImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={workspace.backgroundImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <WorkspaceDefaultBackground className="h-full w-full" />
          )}
        </div>
        <div className="flex flex-col gap-3 border-t-2 border-inkcuba-navy px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-bold tracking-[0.14em] text-inkcuba-purple uppercase">
                Workspace
              </p>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                  statusBadgeClass(workspace.status),
                )}
              >
                {WORKSPACE_STATUS_LABELS[workspace.status]}
              </span>
            </div>
            <h1 className="font-heading mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              {workspace.name}
            </h1>
            <p className="mt-0.5 text-sm text-slate-600">
              {workspace.className} · {workspace.semesterLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-slate-900"
              onClick={() => {
                setTab("info");
                setEditOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition",
                active
                  ? "border-inkcuba-navy bg-sky-50 text-slate-900 shadow-inkcuba"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === "info" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
            <section className="h-fit rounded-2xl border-2 border-inkcuba-navy bg-white p-4 shadow-inkcuba">
              <h2 className="text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">
                Lecturer
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <UserAvatar
                  name={workspace.lecturer.name}
                  image={lecturerImage}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {workspace.lecturer.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {workspace.lecturer.email}
                  </p>
                </div>
              </div>
              {workspace.lecturer.title ? (
                <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                  {workspace.lecturer.title}
                </p>
              ) : null}
              <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <CompactField
                  label="Campus"
                  value={
                    workspace.lecturer.campusLabel ?? workspace.lecturer.campus
                  }
                />
                <CompactField
                  label="Major"
                  value={
                    workspace.lecturer.majorLabel ?? workspace.lecturer.major
                  }
                />
                <CompactField
                  label="Department"
                  value={
                    workspace.lecturer.departmentLabel ??
                    workspace.lecturer.department
                  }
                />
                <CompactField
                  label="BINUSIAN ID"
                  value={workspace.lecturer.binusianId}
                />
                <CompactField label="NIDN" value={workspace.lecturer.nidn} />
              </dl>
            </section>

            <section className="rounded-2xl border-2 border-inkcuba-navy bg-white p-4 shadow-inkcuba sm:p-5">
              <h2 className="font-heading text-lg font-bold text-slate-900">
                Workspace details
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoField label="Name" value={workspace.name} />
                <InfoField label="Class" value={workspace.className} />
                <InfoField label="Semester" value={workspace.semesterLabel} />
                <InfoField
                  label="Status"
                  value={WORKSPACE_STATUS_LABELS[workspace.status]}
                />
              </dl>
              {workspace.status !== "ACTIVE" ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {WORKSPACE_STATUS_HINTS[workspace.status]} Students cannot
                  access this workspace until you set status to{" "}
                  <span className="font-semibold">Active</span>.
                </p>
              ) : null}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-[11px] font-bold tracking-[0.12em] text-slate-500 uppercase">
                  Description
                </p>
                {workspace.description ? (
                  <div
                    className="inkcuba-rich-text-content mt-2 text-sm leading-relaxed text-slate-700"
                    dangerouslySetInnerHTML={{
                      __html: workspace.description,
                    }}
                  />
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No description yet. Use Edit to add one.
                  </p>
                )}
              </div>
            </section>
          </div>
        ) : null}

        {tab === "people" ? (
          <WorkspacePeopleTab
            workspaceId={workspaceId}
            inviteCode={workspace.inviteCode}
            workspaceStatus={workspace.status}
          />
        ) : null}
        {tab === "submission" ? (
          <ComingSoonPanel
            title="Submission"
            description="Soon you’ll create submission slots (cards) so enrolled students can submit portfolios for review."
          />
        ) : null}
        {tab === "scoring" ? (
          <ComingSoonPanel
            title="Scoring"
            description="Soon you’ll grade, give feedback, and monitor portfolio status for every submission in this workspace."
          />
        ) : null}
      </motion.div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (submitting) return;
          setEditOpen(open);
          if (!open) setPendingSave(null);
        }}
      >
        <DialogContent
          showCloseButton={!submitting}
          className="max-h-[90vh] overflow-y-auto border-2 border-slate-900 shadow-inkcuba sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-slate-900">
              Edit workspace
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Update class details, semester, status, background, or
              description. You’ll confirm before changes are saved.
            </DialogDescription>
          </DialogHeader>
          <WorkspaceForm
            key={`${workspace.id}-${workspace.updatedAt}-edit`}
            mode="edit"
            submitting={submitting}
            currentSemesterValue={workspace.semester}
            backgroundPreviewUrl={workspace.backgroundImageUrl}
            imageUploadUrl={`/api/lecturer/workspaces/${workspaceId}/description-image`}
            initial={{
              name: workspace.name,
              className: workspace.className,
              semester: workspace.semester,
              description: workspace.description ?? "",
              status: workspace.status,
            }}
            onSubmit={async (input) => {
              setPendingSave(input);
              setConfirmSave(true);
            }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmSave}
        onOpenChange={(open) => {
          setConfirmSave(open);
          if (!open && !submitting) setPendingSave(null);
        }}
        title="Save workspace changes?"
        description="Updated name, class, semester, status, description, and background will be saved immediately. Draft and Inactive workspaces stay closed to students. Previous background images are removed from storage when replaced."
        confirmLabel="Save changes"
        loading={submitting}
        onConfirm={async () => {
          if (!pendingSave) return;
          await persistUpdate(pendingSave);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this workspace?"
        description="This permanently deletes the workspace and its background/description images from storage. This cannot be undone."
        confirmLabel="Delete workspace"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function CompactField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <dt className="shrink-0 font-bold tracking-wide text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-right font-medium break-words text-slate-900">
        {value?.trim() ? value : "—"}
      </dd>
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold tracking-[0.12em] text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium break-words text-slate-900">
        {value?.trim() ? value : "—"}
      </dd>
    </div>
  );
}

function ComingSoonPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-inkcuba-navy bg-gradient-to-br from-violet-50 to-white p-6 shadow-inkcuba sm:p-8">
      <p className="text-xs font-bold tracking-[0.14em] text-inkcuba-purple uppercase">
        Coming soon
      </p>
      <h2 className="mt-2 font-heading text-xl font-bold text-slate-900">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  );
}
