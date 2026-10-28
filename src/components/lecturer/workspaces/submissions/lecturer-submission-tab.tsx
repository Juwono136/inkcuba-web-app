"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SubmissionFormFields } from "@/components/lecturer/workspaces/submissions/submission-form-fields";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { TypedConfirmDialog } from "@/components/ui/typed-confirm-dialog";
import {
  SubmissionBackLink,
  SubmissionDetailCard,
  SubmissionListCard,
} from "@/components/workspaces/submission-cards";
import { SubmissionGroupBoard } from "@/components/workspaces/submission-group-board";
import { SubmissionPager } from "@/components/workspaces/submission-pager";
import { SubmissionToolbar } from "@/components/workspaces/submission-toolbar";
import { readApiJson } from "@/lib/api/read-response";
import type { SubmissionListPage, SubmissionRecord } from "@/lib/workspaces/submissions/types";
import type { SubmissionSortField } from "@/lib/workspaces/submissions/types";
import type { SubmissionWriteInput } from "@/lib/workspaces/submissions/validators";

type LecturerSubmissionTabProps = {
  workspaceId: string;
};

function readPayload<T>(response: Response, fallback: string): Promise<T> {
  return readApiJson<T>(response, fallback);
}

export function LecturerSubmissionTab({ workspaceId }: LecturerSubmissionTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const submissionId = searchParams.get("submission");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [sortBy, setSortBy] = useState<SubmissionSortField>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubmissionRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [q]);

  function openSubmission(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "submission");
    if (id) params.set("submission", id);
    else params.delete("submission");
    params.delete("view");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const listQuery = useQuery({
    queryKey: ["lecturer-submissions", workspaceId, page, pageSize, debouncedQ, status, type, sortBy, sortDir],
    queryFn: async () => {
      const search = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: debouncedQ,
        status,
        type,
        sortBy,
        sortDir,
      });
      const response = await fetch(
        `/api/lecturer/workspaces/${workspaceId}/submissions?${search}`,
      );
      return readPayload<SubmissionListPage>(response, "Failed to load submissions");
    },
  });

  const detailQuery = useQuery({
    queryKey: ["lecturer-submission", workspaceId, submissionId],
    enabled: Boolean(submissionId),
    queryFn: async () => {
      const response = await fetch(
        `/api/lecturer/workspaces/${workspaceId}/submissions/${submissionId}`,
      );
      const data = await readPayload<{ submission: SubmissionRecord }>(
        response,
        "Failed to load submission",
      );
      return data.submission;
    },
  });

  async function refreshAll() {
    await queryClient.invalidateQueries({ queryKey: ["lecturer-submissions", workspaceId] });
    await queryClient.invalidateQueries({ queryKey: ["lecturer-submission", workspaceId] });
    await queryClient.invalidateQueries({ queryKey: ["workspace-submission-current"] });
    await queryClient.invalidateQueries({ queryKey: ["submission-groups"] });
  }

  async function save(input: SubmissionWriteInput) {
    setSaving(true);
    try {
      const response = await fetch(
        editing
          ? `/api/lecturer/workspaces/${workspaceId}/submissions/${editing.id}`
          : `/api/lecturer/workspaces/${workspaceId}/submissions`,
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const data = await readPayload<{ submission: SubmissionRecord }>(
        response,
        "Unable to save submission",
      );
      toast.success(
        editing
          ? "Submission updated"
          : input.status === "ACTIVE"
            ? "Submission published"
            : "Draft submission created",
      );
      setFormOpen(false);
      setEditing(null);
      await refreshAll();
      if (!editing) openSubmission(data.submission.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save submission");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: "publish" | "close" | "delete") {
    if (!detailQuery.data) return;
    setSaving(true);
    try {
      const response = await fetch(
        action === "delete"
          ? `/api/lecturer/workspaces/${workspaceId}/submissions/${detailQuery.data.id}`
          : `/api/lecturer/workspaces/${workspaceId}/submissions/${detailQuery.data.id}/${action}`,
        { method: action === "delete" ? "DELETE" : "POST" },
      );
      await readPayload(response, "Unable to update submission");
      toast.success(
        action === "delete"
          ? "Submission deleted"
          : action === "publish"
            ? "Submission published"
            : "Submission closed",
      );
      await refreshAll();
      if (action === "delete") openSubmission(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update submission");
      throw error;
    } finally {
      setSaving(false);
    }
  }

  if (submissionId) {
    const item = detailQuery.data;
    return (
      <div className="space-y-4">
        <SubmissionBackLink onClick={() => openSubmission(null)} />
        {detailQuery.isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <InkcubaLoader label="Loading submission…" />
          </div>
        ) : detailQuery.isError || !item ? (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {detailQuery.error instanceof Error
              ? detailQuery.error.message
              : "Unable to open this submission"}
          </div>
        ) : (
          <>
            <SubmissionDetailCard
              item={item}
              actions={
                <>
                  {item.status !== "CLOSED" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-900"
                      onClick={() => {
                        setEditing(item);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  ) : null}
                  {item.status === "DRAFT" ? (
                    <Button
                      type="button"
                      className="bg-inkcuba-cyan hover:bg-sky-600"
                      onClick={() => setConfirmPublish(true)}
                    >
                      Publish
                    </Button>
                  ) : null}
                  {item.status === "ACTIVE" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-900"
                      onClick={() => setConfirmClose(true)}
                    >
                      Close
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete
                  </Button>
                </>
              }
            />
            {item.type === "GROUP" ? (
              <SubmissionGroupBoard
                workspaceId={workspaceId}
                submissionId={item.id}
                mode="lecturer"
                status={item.status}
              />
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-inkcuba-navy bg-white p-4 text-sm text-slate-600">
                Individual submissions do not use groups. Each student prepares
                their own project after you publish this slot.
              </p>
            )}
          </>
        )}
        <FormDialog
          open={formOpen}
          editing={editing}
          saving={saving}
          onOpenChange={(open) => {
            if (saving) return;
            setFormOpen(open);
            if (!open) setEditing(null);
          }}
          onSubmit={save}
        />
        <ConfirmDialog
          open={confirmPublish}
          onOpenChange={setConfirmPublish}
          title="Publish this submission?"
          description="Students in an active workspace will see it and can start forming groups."
          confirmLabel="Publish"
          loading={saving}
          onConfirm={() => runAction("publish")}
        />
        <ConfirmDialog
          open={confirmClose}
          onOpenChange={setConfirmClose}
          title="Close this submission?"
          description="Students can still read it, but groups and edits are locked."
          confirmLabel="Close submission"
          loading={saving}
          onConfirm={() => runAction("close")}
        />
        <TypedConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this submission?"
          description="This removes the slot, its groups, and any student project data stored on it. Type the submission title to confirm. This cannot be undone."
          confirmPhrase={detailQuery.data?.title ?? ""}
          confirmPhraseLabel="Type the submission title to confirm"
          confirmLabel="Delete submission"
          variant="destructive"
          loading={saving}
          onConfirm={() => runAction("delete")}
        />
      </div>
    );
  }

  const pageData = listQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-slate-900">Submissions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create a slot, publish it, then let students prepare a project.
          </p>
        </div>
        <Button
          type="button"
          className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New submission
        </Button>
      </div>

      <SubmissionToolbar
        q={q}
        onQChange={setQ}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        statusOptions={[
          { value: "ALL", label: "All statuses" },
          { value: "DRAFT", label: "Draft" },
          { value: "ACTIVE", label: "Active" },
          { value: "CLOSED", label: "Closed" },
        ]}
        type={type}
        onTypeChange={(value) => {
          setType(value);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortByChange={(value) => {
          setSortBy(value);
          setPage(1);
        }}
        sortDir={sortDir}
        onSortDirChange={(value) => {
          setSortDir(value);
          setPage(1);
        }}
        hasFilters={Boolean(debouncedQ) || status !== "ALL" || type !== "ALL"}
        activeFilterCount={
          (debouncedQ ? 1 : 0) + (status !== "ALL" ? 1 : 0) + (type !== "ALL" ? 1 : 0)
        }
        onClear={() => {
          setQ("");
          setDebouncedQ("");
          setStatus("ALL");
          setType("ALL");
          setPage(1);
        }}
      />

      {listQuery.isLoading ? (
        <div className="flex min-h-[220px] items-center justify-center">
          <InkcubaLoader label="Loading submissions…" />
        </div>
      ) : listQuery.isError ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : "Unable to load submissions"}
        </div>
      ) : pageData && pageData.items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-inkcuba-navy bg-white px-6 py-14 text-center">
          <p className="font-heading font-bold text-slate-900">No submissions yet</p>
          <p className="mt-1 text-sm text-slate-600">
            {debouncedQ || status !== "ALL" || type !== "ALL"
              ? "Nothing matches these filters."
              : "Create a draft, then publish it for your class."}
          </p>
        </div>
      ) : pageData ? (
        <>
          <div className="space-y-3">
            {pageData.items.map((item) => (
              <SubmissionListCard
                key={item.id}
                item={item}
                onOpen={() => openSubmission(item.id)}
              />
            ))}
          </div>
          <SubmissionPager
            page={pageData.page}
            pageSize={pageData.pageSize}
            total={pageData.total}
            totalPages={pageData.totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      ) : null}

      <FormDialog
        open={formOpen}
        editing={editing}
        saving={saving}
        onOpenChange={(open) => {
          if (saving) return;
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        onSubmit={save}
      />
    </div>
  );
}

function FormDialog({
  open,
  editing,
  saving,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  editing: SubmissionRecord | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: SubmissionWriteInput) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!saving}
        className="max-h-[min(92vh,920px)] w-[calc(100%-1.5rem)] overflow-y-auto border-2 border-slate-900 shadow-inkcuba sm:max-w-3xl lg:max-w-5xl"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-slate-900">
            {editing ? "Edit submission" : "New submission"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Title, schedule, maximum score, type, and status are required. Description is optional.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <SubmissionFormFields
              key={editing?.id ?? "new"}
              mode={editing ? "edit" : "create"}
              initial={editing}
              submitting={saving}
              onCancel={() => onOpenChange(false)}
              onSubmit={onSubmit}
            />
          </motion.div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
