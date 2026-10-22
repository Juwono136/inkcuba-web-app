"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileSpreadsheet,
  Link2,
  Loader2,
  Plus,
  Search,
  Share2,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  optionsForCategory,
  useAllDirectoryOptions,
} from "@/hooks/use-directory-options";
import { clientEnv } from "@/config/env-client";
import { getPublicProfileHref } from "@/lib/profiles/public-profile-path";
import { cn } from "@/lib/utils";
import type {
  WorkspaceCandidatePage,
  WorkspaceImportItemRecord,
  WorkspaceImportJobRecord,
  WorkspaceMemberListPage,
} from "@/lib/workspaces/members/types";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

type WorkspacePeopleTabProps = {
  workspaceId: string;
  inviteCode: string;
  workspaceStatus: "DRAFT" | "ACTIVE" | "INACTIVE";
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!payload.success) {
    throw new Error(payload.error?.message || "Request failed");
  }
  return payload.data;
}

export function WorkspacePeopleTab({
  workspaceId,
  inviteCode,
  workspaceStatus,
}: WorkspacePeopleTabProps) {
  const queryClient = useQueryClient();
  const [memberQ, setMemberQ] = useState("");
  const [debouncedMemberQ, setDebouncedMemberQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    // Expand by default on md+, collapse on smaller screens (user can still toggle)
    const mq = window.matchMedia("(min-width: 768px)");
    setInviteOpen(mq.matches);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedMemberQ(memberQ.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [memberQ]);

  const membersQuery = useQuery({
    queryKey: [
      "workspace-members",
      workspaceId,
      page,
      pageSize,
      debouncedMemberQ,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedMemberQ) params.set("q", debouncedMemberQ);
      return fetchJson<WorkspaceMemberListPage>(
        `/api/lecturer/workspaces/${workspaceId}/members?${params}`,
      );
    },
    placeholderData: (previous) => previous,
  });

  const inviteLink = `${clientEnv.NEXT_PUBLIC_APP_URL}/join?code=${encodeURIComponent(inviteCode)}`;
  const hasMemberSearch = Boolean(debouncedMemberQ);
  const memberTotal = membersQuery.data?.total ?? 0;

  async function copyText(kind: "link" | "code", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(kind === "link" ? "Invite link copied" : "Invite code copied");
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Unable to copy");
    }
  }

  async function handleRemove() {
    if (!removeId) return;
    await fetchJson(`/api/lecturer/workspaces/${workspaceId}/members/${removeId}`, {
      method: "DELETE",
    });
    toast.success("Student removed from workspace");
    setRemoveId(null);
    await queryClient.invalidateQueries({
      queryKey: ["workspace-members", workspaceId],
    });
  }

  function downloadTemplate() {
    window.open(
      `/api/lecturer/workspaces/${workspaceId}/members/template`,
      "_blank",
      "noopener,noreferrer",
    );
    toast.success("Template download started");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <section className="overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba">
        <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-inkcuba-navy bg-gradient-to-br from-sky-50 to-violet-50 text-inkcuba-purple">
            <Share2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-lg font-bold text-slate-900">
                Invite students
              </h2>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                  workspaceStatus === "ACTIVE"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-amber-300 bg-amber-50 text-amber-900",
                )}
              >
                {workspaceStatus === "ACTIVE" ? "Join open" : "Join closed"}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-600">
              Share a link or 8-character code
              {workspaceStatus !== "ACTIVE"
                ? ` — workspace is ${workspaceStatus.toLowerCase()}, students cannot join yet`
                : " — students can join while this workspace is Active"}
              .
            </p>
          </div>
          <button
            type="button"
            aria-expanded={inviteOpen}
            aria-label={inviteOpen ? "Hide invite details" : "Show invite details"}
            onClick={() => setInviteOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 text-slate-600 transition hover:border-slate-900 hover:bg-slate-50 hover:text-slate-900"
          >
            <ChevronDown
              className={cn(
                "h-5 w-5 transition-transform",
                inviteOpen && "rotate-180",
              )}
            />
          </button>
        </div>

        <motion.div
          initial={false}
          animate={{
            height: inviteOpen ? "auto" : 0,
            opacity: inviteOpen ? 1 : 0,
          }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="space-y-4 border-t border-slate-100 px-4 py-4 sm:px-5">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-inkcuba-cyan" />
                  <Label className="text-slate-800">Invite link</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteLink}
                    className="rounded-xl border-2 border-slate-900 bg-white text-xs sm:text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 border-slate-900"
                    aria-label="Copy invite link"
                    onClick={() => copyText("link", inviteLink)}
                  >
                    {copied === "link" ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  Best for chat or LMS posts. Opens the join page with the code
                  filled in.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-inkcuba-purple" />
                  <Label className="text-slate-800">Invite code</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteCode}
                    className="rounded-xl border-2 border-slate-900 bg-white font-mono text-base tracking-[0.2em]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 border-slate-900"
                    aria-label="Copy invite code"
                    onClick={() => copyText("code", inviteCode)}
                  >
                    {copied === "code" ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  Students enter this code on the join page, or open the invite
                  link above. Works only while the workspace status is Active.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-slate-900">
            People
          </h2>
          <p className="text-sm text-slate-600">
            Add registered students one-by-one or import an Excel list with
            preview.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-900 sm:w-auto"
            onClick={() => setTemplateConfirmOpen(true)}
          >
            <Download className="h-4 w-4" />
            Template
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-900 sm:w-auto"
            onClick={() => setImportOpen(true)}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
          </Button>
          <Button
            type="button"
            className="w-full bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600 sm:w-auto"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add students
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={memberQ}
            onChange={(e) => setMemberQ(e.target.value)}
            placeholder="Search members by name, email, or NIM…"
            className="rounded-xl border-2 border-slate-900 bg-white pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="whitespace-nowrap">Per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[4.5rem] rounded-xl border-2 border-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[6, 12, 24, 48].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {membersQuery.isLoading ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-inkcuba-cyan" />
        </div>
      ) : membersQuery.isError ? (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {(membersQuery.error as Error).message}
        </div>
      ) : !membersQuery.data || memberTotal === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-inkcuba-navy bg-white p-8 text-center shadow-inkcuba">
          <Users className="mx-auto mb-3 h-8 w-8 text-inkcuba-purple" />
          <h3 className="font-heading text-base font-bold text-slate-900">
            {hasMemberSearch ? "No matching students" : "No students yet"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            {hasMemberSearch
              ? "Try a different search, or clear the search box to see everyone."
              : "Add students manually, import Excel, or share the invite link/code."}
          </p>
          {hasMemberSearch ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4 border-slate-900"
              onClick={() => setMemberQ("")}
            >
              Clear search
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Mobile / tablet: stacked cards (no horizontal overflow) */}
          <div className="space-y-3 lg:hidden">
            {membersQuery.data.items.map((member) => {
              const sourceLabel =
                member.source === "MANUAL"
                  ? "Manual"
                  : member.source === "EXCEL"
                    ? "Excel"
                    : member.source === "LINK"
                      ? "Invite link"
                      : "Invite code";

              return (
                <article
                  key={member.id}
                  className="rounded-2xl border-2 border-inkcuba-navy bg-white p-4 shadow-inkcuba"
                >
                  <div className="flex items-start gap-3">
                    <Link
                      href={getPublicProfileHref({
                        id: member.user.id,
                        role: "STUDENT",
                        nim: member.user.nim,
                      })}
                      className="shrink-0 rounded-full transition hover:opacity-90"
                      aria-label={`Open ${member.user.name} public profile`}
                    >
                      <UserAvatar
                        name={member.user.name}
                        image={member.user.image}
                        size="md"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={getPublicProfileHref({
                            id: member.user.id,
                            role: "STUDENT",
                            nim: member.user.nim,
                          })}
                          className="truncate font-heading text-base font-bold text-slate-900 underline-offset-2 hover:text-inkcuba-purple hover:underline"
                        >
                          {member.user.name}
                        </Link>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                            member.status === "ACTIVE"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : "border-amber-300 bg-amber-50 text-amber-900",
                          )}
                        >
                          {member.status === "ACTIVE" ? "Active" : "Invited"}
                        </span>
                      </div>
                      <p className="mt-0.5 break-all text-xs text-slate-500">
                        {member.user.email}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                        Student ID / NIM
                      </dt>
                      <dd className="mt-1">
                        <span className="inline-flex max-w-full truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-medium text-slate-800">
                          {member.user.nim ?? "—"}
                        </span>
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                        Batch
                      </dt>
                      <dd className="mt-1 truncate text-slate-800">
                        {member.user.batchLabel ?? (
                          <span className="text-slate-400">Not set</span>
                        )}
                      </dd>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <dt className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                        Academic Program
                      </dt>
                      <dd className="mt-1 text-slate-800">
                        {member.user.majorLabel ?? (
                          <span className="text-slate-400">Not set</span>
                        )}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                        Joined via
                      </dt>
                      <dd className="mt-1">
                        <span className="inline-flex rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
                          {sourceLabel}
                        </span>
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => setRemoveId(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop: full data table */}
          <div className="hidden overflow-hidden rounded-2xl border-2 border-inkcuba-navy bg-white shadow-inkcuba lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b-2 border-inkcuba-navy bg-gradient-to-r from-sky-50 via-violet-50 to-amber-50 text-[11px] font-bold tracking-wide text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="whitespace-nowrap px-4 py-3">
                      Student ID / NIM
                    </th>
                    <th className="px-4 py-3">Academic Program</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined via</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {membersQuery.data.items.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3">
                        <div className="flex min-w-[200px] items-center gap-3">
                          <Link
                            href={getPublicProfileHref({
                              id: member.user.id,
                              role: "STUDENT",
                              nim: member.user.nim,
                            })}
                            className="shrink-0 rounded-full transition hover:opacity-90"
                            aria-label={`Open ${member.user.name} public profile`}
                          >
                            <UserAvatar
                              name={member.user.name}
                              image={member.user.image}
                              size="sm"
                            />
                          </Link>
                          <div className="min-w-0">
                            <Link
                              href={getPublicProfileHref({
                                id: member.user.id,
                                role: "STUDENT",
                                nim: member.user.nim,
                              })}
                              className="truncate font-semibold text-slate-900 underline-offset-2 hover:text-inkcuba-purple hover:underline"
                            >
                              {member.user.name}
                            </Link>
                            <p className="truncate text-xs text-slate-500">
                              {member.user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-medium text-slate-800">
                          {member.user.nim ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {member.user.majorLabel ?? (
                          <span className="text-slate-400">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {member.user.batchLabel ?? (
                          <span className="text-slate-400">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                            member.status === "ACTIVE"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : "border-amber-300 bg-amber-50 text-amber-900",
                          )}
                        >
                          {member.status === "ACTIVE" ? "Active" : "Invited"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
                          {member.source === "MANUAL"
                            ? "Manual"
                            : member.source === "EXCEL"
                              ? "Excel"
                              : member.source === "LINK"
                                ? "Invite link"
                                : "Invite code"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => setRemoveId(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-center text-xs text-slate-600 sm:text-left sm:text-sm">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {(membersQuery.data.page - 1) * membersQuery.data.pageSize + 1}
                –
                {Math.min(
                  membersQuery.data.page * membersQuery.data.pageSize,
                  membersQuery.data.total,
                )}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {membersQuery.data.total}
              </span>
              {hasMemberSearch ? " (filtered)" : ""}
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-900 px-2 sm:px-3"
                disabled={page <= 1}
                aria-label="Previous page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Prev</span>
              </Button>
              <span className="min-w-[3.5rem] text-center text-xs font-semibold text-slate-700">
                {membersQuery.data.page} / {membersQuery.data.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-900 px-2 sm:px-3"
                disabled={page >= membersQuery.data.totalPages}
                aria-label="Next page"
                onClick={() => setPage((p) => p + 1)}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <AddStudentsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        workspaceId={workspaceId}
        onAdded={async () => {
          await queryClient.invalidateQueries({
            queryKey: ["workspace-members", workspaceId],
          });
        }}
      />

      <ImportExcelDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        workspaceId={workspaceId}
        onCommitted={async () => {
          await queryClient.invalidateQueries({
            queryKey: ["workspace-members", workspaceId],
          });
        }}
      />

      <ConfirmDialog
        open={templateConfirmOpen}
        onOpenChange={setTemplateConfirmOpen}
        title="Download Excel template?"
        description="Downloads a ready-to-fill student list template. Use the Academic Program and Batch dropdowns in Excel — they match your Admin Directory Options. Row 2 is an example you can replace."
        confirmLabel="Download template"
        onConfirm={async () => {
          downloadTemplate();
        }}
      />

      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(open) => {
          if (!open) setRemoveId(null);
        }}
        title="Remove student?"
        description="The student will lose access to this workspace. You can add them again later."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemove}
      />
    </motion.div>
  );
}

function AddStudentsDialog({
  open,
  onOpenChange,
  workspaceId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onAdded: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setSelected(new Set());
    }
  }, [open]);

  const candidatesQuery = useQuery({
    queryKey: ["workspace-candidates", workspaceId, debouncedQ],
    enabled: open,
    queryFn: () => {
      const params = new URLSearchParams({ page: "1", pageSize: "20" });
      if (debouncedQ) params.set("q", debouncedQ);
      return fetchJson<WorkspaceCandidatePage>(
        `/api/lecturer/workspaces/${workspaceId}/members/candidates?${params}`,
      );
    },
  });

  async function submitAdd() {
    setSubmitting(true);
    try {
      const result = await fetchJson<{ added: number; skipped: number }>(
        `/api/lecturer/workspaces/${workspaceId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: [...selected] }),
        },
      );
      toast.success(
        `Added ${result.added} student(s)${result.skipped ? `, skipped ${result.skipped}` : ""}`,
      );
      setConfirmOpen(false);
      onOpenChange(false);
      await onAdded();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add");
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-2 border-slate-900 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">
              Add students
            </DialogTitle>
            <DialogDescription>
              Search registered students and select who to invite to this
              workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-sm text-slate-600">
              Selected{" "}
              <span className="font-bold text-slate-900">{selected.size}</span>{" "}
              student{selected.size === 1 ? "" : "s"}
            </p>
            {selected.size > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-slate-900"
                onClick={() => setSelected(new Set())}
              >
                Clear selection
              </Button>
            ) : null}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, NIM…"
              className="rounded-xl border-2 border-slate-900 pl-9"
            />
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
            {candidatesQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-inkcuba-cyan" />
              </div>
            ) : candidatesQuery.data?.items.length ? (
              candidatesQuery.data.items.map((item) => {
                const checked = selected.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2",
                      checked
                        ? "border-inkcuba-purple bg-violet-50"
                        : "border-transparent hover:bg-slate-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-inkcuba-purple"
                      checked={checked}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      }}
                    />
                    <UserAvatar
                      name={item.name}
                      image={item.image}
                      className="h-8 w-8"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {item.email}
                        {item.nim ? ` · ${item.nim}` : ""}
                      </p>
                    </div>
                  </label>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                {debouncedQ
                  ? "No matching students found."
                  : "Type to search registered students."}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <p className="text-xs text-slate-500 sm:self-center">
              {selected.size} of max 50 can be invited per batch
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-900"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={selected.size === 0}
                className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
                onClick={() => setConfirmOpen(true)}
              >
                Add {selected.size} selected
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Invite selected students?"
        description={`${selected.size} student(s) will be invited and notified by email.`}
        confirmLabel="Send invites"
        loading={submitting}
        onConfirm={submitAdd}
      />
    </>
  );
}

function ImportExcelDialog({
  open,
  onOpenChange,
  workspaceId,
  onCommitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onCommitted: () => Promise<void>;
}) {
  const directoryQuery = useAllDirectoryOptions();
  const majorOptions = useMemo(
    () => optionsForCategory(directoryQuery.data, "major"),
    [directoryQuery.data],
  );
  const batchOptions = useMemo(
    () => optionsForCategory(directoryQuery.data, "batch"),
    [directoryQuery.data],
  );

  const [job, setJob] = useState<WorkspaceImportJobRecord | null>(null);
  const [items, setItems] = useState<WorkspaceImportItemRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setJob(null);
      setItems([]);
    }
  }, [open]);

  useEffect(() => {
    if (!job || (job.status !== "COMMITTING" && job.status !== "COMPLETED")) {
      return;
    }
    const timer = window.setInterval(async () => {
      try {
        const data = await fetchJson<{
          job: WorkspaceImportJobRecord;
          items: WorkspaceImportItemRecord[];
        }>(
          `/api/lecturer/workspaces/${workspaceId}/members/import/${job.id}?page=1&pageSize=100`,
        );
        setJob(data.job);
        setItems(data.items);
        if (data.job.status === "COMPLETED") {
          toast.success("Import completed");
          await onCommitted();
        }
      } catch {
        // ignore transient poll errors
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [job, workspaceId, onCommitted]);

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await fetchJson<{ job: WorkspaceImportJobRecord }>(
        `/api/lecturer/workspaces/${workspaceId}/members/import`,
        { method: "POST", body: form },
      );
      const detail = await fetchJson<{
        job: WorkspaceImportJobRecord;
        items: WorkspaceImportItemRecord[];
      }>(
        `/api/lecturer/workspaces/${workspaceId}/members/import/${data.job.id}?page=1&pageSize=100`,
      );
      setJob(detail.job);
      setItems(detail.items);
      toast.success("File parsed — review the preview before committing");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function patchItem(
    itemId: string,
    patch: Record<string, string>,
  ) {
    const data = await fetchJson<{ item: WorkspaceImportItemRecord }>(
      `/api/lecturer/workspaces/${workspaceId}/members/import/${job!.id}/items/${itemId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? data.item : item)),
    );
    const detail = await fetchJson<{ job: WorkspaceImportJobRecord }>(
      `/api/lecturer/workspaces/${workspaceId}/members/import/${job!.id}?page=1&pageSize=1`,
    );
    setJob(detail.job);
  }

  async function commit() {
    if (!job) return;
    setCommitting(true);
    try {
      const data = await fetchJson<{ job: WorkspaceImportJobRecord }>(
        `/api/lecturer/workspaces/${workspaceId}/members/import/${job.id}/commit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({}),
        },
      );
      setJob(data.job);
      setConfirmOpen(false);
      toast.success("Import started — processing in the background");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Commit failed");
      throw error;
    } finally {
      setCommitting(false);
    }
  }

  const progress =
    job && job.rowCount > 0
      ? Math.round((job.processedCount / job.rowCount) * 100)
      : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-2 border-slate-900 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold">
              Import students from Excel
            </DialogTitle>
            <DialogDescription>
              Upload the template, fix any preview warnings, then commit.
              Academic Program and Batch must match live Directory Options
              (synced from Admin → Directory Options). Invalid values block
              commit until fixed.
            </DialogDescription>
          </DialogHeader>

          {!job ? (
            <div className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-inkcuba-navy bg-slate-50 px-4 py-10 text-center transition hover:bg-sky-50/60">
                <Upload className="h-8 w-8 text-inkcuba-purple" />
                <div>
                  <p className="font-semibold text-slate-900">
                    {uploading
                      ? "Uploading & parsing…"
                      : "Drop or choose .xlsx file"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Use the inkcuba template · Max 5MB · columns: Name, Student
                    ID / NIM, Email, Academic Program, Batch
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
                />
              </label>
              {uploading ? (
                <div className="space-y-2 rounded-xl border-2 border-sky-200 bg-sky-50/80 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-sky-900">
                    <span>Uploading and validating rows…</span>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-sky-100">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-inkcuba-cyan" />
                  </div>
                  <p className="text-[11px] text-sky-800/80">
                    Large files are parsed securely on the server. Please keep
                    this dialog open.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">
                  {job.fileName}
                </span>
                <span>
                  {job.validCount} valid · {job.errorCount} errors · {job.rowCount}{" "}
                  rows
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 font-bold uppercase",
                    job.status === "READY"
                      ? "border-sky-300 bg-sky-50 text-sky-800"
                      : job.status === "COMPLETED"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-amber-300 bg-amber-50 text-amber-900",
                  )}
                >
                  {job.status}
                </span>
              </div>

              {(job.status === "COMMITTING" ||
                job.status === "COMPLETED" ||
                committing) && (
                <div className="space-y-2 rounded-xl border-2 border-inkcuba-navy/20 bg-gradient-to-r from-sky-50 to-violet-50 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <p className="font-semibold text-slate-900">
                      {job.status === "COMPLETED"
                        ? "Import complete"
                        : "Import in progress"}
                    </p>
                    <span className="font-mono text-xs font-bold text-inkcuba-purple">
                      {Math.min(100, progress)}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full border border-slate-200 bg-white">
                    <div
                      className={cn(
                        "h-full rounded-full bg-inkcuba-cyan transition-all duration-500 ease-out",
                        job.status === "COMPLETED" && "bg-emerald-500",
                      )}
                      style={{ width: `${Math.min(100, Math.max(progress, committing && progress === 0 ? 4 : progress))}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600">
                    Processed {job.processedCount} of {job.rowCount} rows
                    {job.status === "COMMITTING"
                      ? " — invites are queued in the background"
                      : ""}
                    .
                  </p>
                </div>
              )}

              <div className="max-h-[45vh] overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2 whitespace-nowrap">Student ID / NIM</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Academic Program</th>
                      <th className="px-3 py-2">Batch</th>
                      <th className="px-3 py-2">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "border-t border-slate-100",
                          item.errors.length > 0 && "bg-red-50/60",
                        )}
                      >
                        <td className="px-3 py-2">{item.rowIndex}</td>
                        <td className="px-3 py-2">
                          <Input
                            value={item.name}
                            disabled={job.status !== "READY"}
                            className="h-8 min-w-[140px] rounded-lg border-slate-300"
                            onBlur={(e) => {
                              if (e.target.value !== item.name) {
                                void patchItem(item.id, { name: e.target.value });
                              }
                            }}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((row) =>
                                  row.id === item.id
                                    ? { ...row, name: e.target.value }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={item.nim}
                            disabled={job.status !== "READY"}
                            className="h-8 min-w-[100px] rounded-lg border-slate-300 font-mono"
                            onBlur={(e) => {
                              if (e.target.value !== item.nim) {
                                void patchItem(item.id, { nim: e.target.value });
                              }
                            }}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((row) =>
                                  row.id === item.id
                                    ? { ...row, nim: e.target.value }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={item.email}
                            disabled={job.status !== "READY"}
                            className="h-8 min-w-[180px] rounded-lg border-slate-300"
                            onBlur={(e) => {
                              if (e.target.value !== item.email) {
                                void patchItem(item.id, {
                                  email: e.target.value,
                                });
                              }
                            }}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((row) =>
                                  row.id === item.id
                                    ? { ...row, email: e.target.value }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={item.majorLabel || undefined}
                            disabled={job.status !== "READY"}
                            onValueChange={(value) => {
                              setItems((prev) =>
                                prev.map((row) =>
                                  row.id === item.id
                                    ? { ...row, majorLabel: value }
                                    : row,
                                ),
                              );
                              void patchItem(item.id, { majorLabel: value });
                            }}
                          >
                            <SelectTrigger className="h-8 min-w-[160px] rounded-lg border-slate-300">
                              <SelectValue placeholder="Select major" />
                            </SelectTrigger>
                            <SelectContent>
                              {majorOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.label}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={item.batchLabel || undefined}
                            disabled={job.status !== "READY"}
                            onValueChange={(value) => {
                              setItems((prev) =>
                                prev.map((row) =>
                                  row.id === item.id
                                    ? { ...row, batchLabel: value }
                                    : row,
                                ),
                              );
                              void patchItem(item.id, { batchLabel: value });
                            }}
                          >
                            <SelectTrigger className="h-8 min-w-[100px] rounded-lg border-slate-300">
                              <SelectValue placeholder="Batch" />
                            </SelectTrigger>
                            <SelectContent>
                              {batchOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.label}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2">
                          <div className="space-y-1">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">
                              {item.matchType}
                            </span>
                            {item.errors.map((err) => (
                              <p key={err} className="text-red-600">
                                {err}
                              </p>
                            ))}
                            {item.warnings.map((warn) => (
                              <p key={warn} className="text-amber-700">
                                {warn}
                              </p>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-slate-900"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {job?.status === "READY" ? (
              <Button
                type="button"
                disabled={!job.canCommit}
                className="bg-inkcuba-cyan shadow-inkcuba hover:bg-sky-600"
                onClick={() => setConfirmOpen(true)}
              >
                Commit import
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Commit Excel import?"
        description="Valid rows will be invited asynchronously. New students receive an activation email; existing students get a workspace invite."
        confirmLabel="Commit"
        loading={committing}
        onConfirm={commit}
      />
    </>
  );
}
