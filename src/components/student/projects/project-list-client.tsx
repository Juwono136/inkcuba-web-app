"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, FolderOpen, Pencil, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmissionPager } from "@/components/workspaces/submission-pager";
import { readApiJson } from "@/lib/api/read-response";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/projects/limits";

type ProjectList = {
  items: Array<{
    id: string;
    title: string;
    status: ProjectStatus;
    updatedAt: string;
    workspaceName: string | null;
    className: string | null;
    semesterLabel: string | null;
    submissionTitle: string | null;
    kind: "INDIVIDUAL" | "GROUP";
    canEdit: boolean;
    canDelete: boolean;
    accessLabel: string;
    isDetached: boolean;
    submissionHref: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function ProjectListClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [pendingDelete, setPendingDelete] = useState<ProjectList["items"][number] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [q]);

  const query = useQuery({
    queryKey: ["student-projects", page, pageSize, debouncedQ, status],
    queryFn: async () => {
      const search = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: debouncedQ,
        status,
      });
      const response = await fetch(`/api/student/projects?${search}`);
      return readApiJson<ProjectList>(response, "Unable to load projects");
    },
    placeholderData: keepPreviousData,
  });

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/student/projects/${pendingDelete.id}`, { method: "DELETE" });
      await readApiJson(response, "Unable to delete the project");
      toast.success("Project deleted");
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["student-projects"] });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to delete the project");
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-slate-900 sm:text-3xl">Project lists</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Your lasting project records. Open a card to view, edit, or delete when allowed. Prepare project from a live
          submission is a separate step — this list keeps every project even after a workspace, group change, or
          submission is removed.
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search by project title"
            className="h-11 rounded-xl border-slate-300 pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-slate-300 lg:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {PROJECT_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {PROJECT_STATUS_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {query.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <InkcubaLoader label="Loading projects…" />
        </div>
      ) : query.isError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {query.error instanceof Error ? query.error.message : "Unable to load projects"}
        </p>
      ) : query.data && query.data.items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 font-heading text-lg font-bold text-slate-900">No projects yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Open a submission and choose Prepare project. Drafts and submissions both appear here afterward.
          </p>
        </div>
      ) : query.data ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.items.map((item) => (
              <article
                key={item.id}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:shadow-md sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-heading text-lg leading-snug font-bold text-slate-900">{item.title}</h2>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${listStatusTone(item.status)}`}
                  >
                    {PROJECT_STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-700 uppercase">
                    {item.kind === "GROUP" ? "Group" : "Individual"}
                  </span>
                  <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {item.accessLabel}
                  </span>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Workspace</p>
                    <p className="mt-0.5 font-semibold break-words text-slate-900">
                      {item.workspaceName || "Removed"}
                    </p>
                  </div>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Meta label="Class" value={item.className} />
                    <Meta label="Semester" value={item.semesterLabel} />
                    <Meta label="Submission" value={item.submissionTitle} wide />
                  </dl>
                </div>
                <p className="mt-4 text-xs text-slate-500">Updated {formatProjectWhen(item.updatedAt)}</p>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <Button type="button" className="bg-inkcuba-cyan hover:bg-sky-600" asChild>
                    <Link href={`/dashboard/student/projects/${item.id}?source=lists`}>
                      {item.canEdit ? <Pencil className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      {item.canEdit ? "Edit" : "Open"}
                    </Link>
                  </Button>
                  {item.submissionHref ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(item.submissionHref!)}
                    >
                      Submission
                    </Button>
                  ) : null}
                  {item.canDelete ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50"
                      onClick={() => setPendingDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          <SubmissionPager
            page={query.data.page}
            pageSize={query.data.pageSize}
            total={query.data.total}
            totalPages={query.data.totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      ) : null}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this project permanently?"
        description={
          pendingDelete?.kind === "GROUP"
            ? "This removes the shared project for every contributor and deletes all files from storage. This cannot be undone."
            : "This removes the project and deletes all files from storage. This cannot be undone."
        }
        confirmLabel="Delete project"
        variant="destructive"
        loading={busy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Meta({ label, value, wide = false }: { label: string; value: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{label}</dt>
      <dd className="font-medium break-words text-slate-800">{value || "Removed"}</dd>
    </div>
  );
}

function listStatusTone(status: ProjectStatus) {
  if (status === "SUBMITTED" || status === "REVISED") return "bg-sky-100 text-sky-800";
  if (status === "IN_REVIEW") return "bg-violet-100 text-violet-800";
  if (status === "NEED_REVISION") return "bg-amber-100 text-amber-900";
  if (status === "PUBLISHED") return "bg-emerald-100 text-emerald-800";
  if (status === "TAKEN_DOWN") return "bg-rose-100 text-rose-800";
  if (status === "ARCHIVED") return "bg-slate-200 text-slate-600";
  return "bg-slate-900 text-white";
}

function formatProjectWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
