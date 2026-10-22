"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getPublicProfileHref } from "@/lib/profiles/public-profile-path";
import { cn } from "@/lib/utils";
import type { WorkspaceMemberListPage } from "@/lib/workspaces/members/types";
import type { StudentWorkspaceDetail } from "@/lib/workspaces/student-service";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

type StudentWorkspacePeopleTabProps = {
  workspaceId: string;
  lecturer: StudentWorkspaceDetail["lecturer"];
};

async function fetchPeople(
  workspaceId: string,
  page: number,
  pageSize: number,
  q: string,
): Promise<WorkspaceMemberListPage> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    status: "ALL",
  });
  if (q) params.set("q", q);

  const response = await fetch(
    `/api/student/workspaces/${workspaceId}/people?${params}`,
  );
  const payload =
    (await response.json()) as ApiEnvelope<WorkspaceMemberListPage>;
  if (!payload.success) {
    throw new Error(payload.error?.message || "Failed to load people");
  }
  return payload.data;
}

export function StudentWorkspacePeopleTab({
  workspaceId,
  lecturer,
}: StudentWorkspacePeopleTabProps) {
  const [memberQ, setMemberQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(memberQ.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [memberQ]);

  const peopleQuery = useQuery({
    queryKey: [
      "student-workspace-people",
      workspaceId,
      page,
      pageSize,
      debouncedQ,
    ],
    queryFn: () => fetchPeople(workspaceId, page, pageSize, debouncedQ),
    placeholderData: (prev) => prev,
  });

  const lecturerHref = getPublicProfileHref({
    id: lecturer.id,
    nim: lecturer.nim,
  });

  const data = peopleQuery.data;
  const from = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border-2 border-inkcuba-navy bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4 shadow-inkcuba sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-inkcuba-purple" />
          <h2 className="font-heading text-lg font-bold text-slate-900">
            Lecturer
          </h2>
        </div>
        <Link
          href={lecturerHref}
          className="group flex items-center gap-3 rounded-2xl border-2 border-inkcuba-navy bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-inkcuba"
        >
          <UserAvatar
            name={lecturer.name}
            image={lecturer.image}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900 group-hover:text-inkcuba-purple">
              {lecturer.name}
            </p>
            {lecturer.title ? (
              <p className="truncate text-xs text-slate-500">{lecturer.title}</p>
            ) : (
              <p className="text-xs text-slate-500">View public profile</p>
            )}
            {lecturer.binusianId ? (
              <p className="mt-0.5 font-mono text-[11px] text-slate-600">
                {lecturer.binusianId}
              </p>
            ) : null}
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-inkcuba-purple" />
        </Link>
      </section>

      <section className="rounded-2xl border-2 border-inkcuba-navy bg-white p-4 shadow-inkcuba sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900">
              Students
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Read-only roster for this workspace. Search by name, email, or
              BINUSIAN ID.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={memberQ}
                onChange={(event) => setMemberQ(event.target.value)}
                placeholder="Search students…"
                className="border-slate-300 pl-9"
                aria-label="Search students"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[72px] border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[12, 24, 48].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {peopleQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
              />
            ))}
          </div>
        ) : peopleQuery.isError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {peopleQuery.error instanceof Error
              ? peopleQuery.error.message
              : "Unable to load people"}
          </p>
        ) : !data || data.items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
            <Users className="mx-auto mb-2 h-7 w-7 text-slate-400" />
            <p className="font-heading text-sm font-bold text-slate-800">
              No students found
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {debouncedQ
                ? "Try a different search term."
                : "Students will appear here once enrolled."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {data.items.map((member, index) => {
                const href = getPublicProfileHref({
                  id: member.user.id,
                  nim: member.user.nim,
                });
                return (
                  <motion.article
                    key={member.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="rounded-2xl border-2 border-inkcuba-navy bg-white p-3.5 shadow-inkcuba"
                  >
                    <div className="flex items-start gap-3">
                      <Link
                        href={href}
                        className="shrink-0"
                        aria-label={`Open ${member.user.name} profile`}
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
                            href={href}
                            className="truncate font-heading text-sm font-bold text-slate-900 underline-offset-2 hover:text-inkcuba-cyan hover:underline"
                          >
                            {member.user.name}
                          </Link>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                              member.status === "ACTIVE"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                : "border-amber-300 bg-amber-50 text-amber-900",
                            )}
                          >
                            {member.status === "ACTIVE" ? "Active" : "Invited"}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-600">
                          {member.user.nim ?? "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {member.user.majorLabel ?? member.user.major ?? "—"}
                          {member.user.batchLabel || member.user.batch
                            ? ` · Batch ${member.user.batchLabel ?? member.user.batch}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border-2 border-slate-200 md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">BINUSIAN ID</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((member) => {
                    const href = getPublicProfileHref({
                      id: member.user.id,
                      nim: member.user.nim,
                    });
                    return (
                      <tr
                        key={member.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={href}
                            className="flex items-center gap-3 transition hover:opacity-90"
                          >
                            <UserAvatar
                              name={member.user.name}
                              image={member.user.image}
                              size="sm"
                            />
                            <span className="font-semibold text-slate-900 underline-offset-2 hover:underline">
                              {member.user.name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          {member.user.nim ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {member.user.majorLabel ?? member.user.major ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {member.user.batchLabel ?? member.user.batch ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                              member.status === "ACTIVE"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                : "border-amber-300 bg-amber-50 text-amber-900",
                            )}
                          >
                            {member.status === "ACTIVE" ? "Active" : "Invited"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Showing {from}-{to} of {data.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-300"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="text-xs font-medium text-slate-600">
                  Page {data.page} / {data.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-300"
                  disabled={data.page >= data.totalPages}
                  onClick={() =>
                    setPage((p) => Math.min(data.totalPages, p + 1))
                  }
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
