"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ScoringToolbar } from "@/components/lecturer/workspaces/scoring/scoring-toolbar";
import { Button } from "@/components/ui/button";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SubmissionPager } from "@/components/workspaces/submission-pager";
import { readApiJson } from "@/lib/api/read-response";
import { getPublicProfileHref } from "@/lib/profiles/public-profile-path";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/projects/limits";
import type { LecturerProjectSortField } from "@/lib/projects/validators";

type ScoringMember = {
  userId: string;
  name: string;
  nim: string | null;
  image: string | null;
};

type ScoringList = {
  items: Array<{
    id: string;
    title: string;
    status: ProjectStatus;
    grade: number | null;
    updatedAt: string;
    who: string;
    kind?: "GROUP" | "INDIVIDUAL";
    maxScore: number | null;
    canModerate: boolean;
    members?: ScoringMember[];
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function LecturerScoringProjectsPanel({
  workspaceId,
  submissionId,
  submissionTitle,
  maxScore,
  onOpenProject,
}: {
  workspaceId: string;
  submissionId: string;
  submissionTitle: string;
  maxScore: number | null;
  onOpenProject: (projectId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("NEEDS_ATTENTION");
  const [sortBy, setSortBy] = useState<LecturerProjectSortField>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [q]);

  const listQuery = useQuery({
    queryKey: [
      "lecturer-scoring-projects",
      workspaceId,
      submissionId,
      page,
      pageSize,
      debouncedQ,
      status,
      sortBy,
      sortDir,
    ],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const search = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: debouncedQ,
        status,
        sortBy,
        sortDir,
        submissionId,
      });
      const response = await fetch(`/api/lecturer/workspaces/${workspaceId}/projects?${search}`);
      return readApiJson<ScoringList>(response, "Unable to load projects for scoring");
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">Scoring slot</p>
        <h3 className="font-heading text-xl font-bold text-slate-900">{submissionTitle}</h3>
        <p className="mt-1 text-sm text-slate-600">
          Only submitted projects appear here. Drafts stay on the student side until they submit.
          Score each project with the submission rubric.
          {maxScore != null ? ` Maximum score ${maxScore}.` : ""}
        </p>
      </div>

      <ScoringToolbar
        q={q}
        onQChange={setQ}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
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
        hasFilters={Boolean(debouncedQ) || status !== "NEEDS_ATTENTION"}
        activeFilterCount={(debouncedQ ? 1 : 0) + (status !== "NEEDS_ATTENTION" ? 1 : 0)}
        onClear={() => {
          setQ("");
          setDebouncedQ("");
          setStatus("NEEDS_ATTENTION");
          setPage(1);
        }}
      />

      {listQuery.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <InkcubaLoader label="Loading projects…" />
        </div>
      ) : listQuery.isError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {listQuery.error instanceof Error ? listQuery.error.message : "Unable to load projects"}
        </p>
      ) : listQuery.data && listQuery.data.items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <Award className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 font-heading text-lg font-bold text-slate-900">No projects ready here</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            {debouncedQ || status !== "NEEDS_ATTENTION"
              ? "Nothing matches these filters for this submission."
              : "Projects appear after students submit. Drafts are hidden from Scoring."}
          </p>
        </div>
      ) : listQuery.data ? (
        <>
          <ul className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
            {listQuery.data.items.map((item) => {
              const members = item.members ?? [];
              const visibleMembers = members.slice(0, 4);
              const extraCount = Math.max(0, members.length - visibleMembers.length);
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-sm transition hover:border-inkcuba-navy"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-base font-bold text-slate-900">{item.who}</p>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-600 uppercase">
                        {item.kind === "INDIVIDUAL" ? "Individual" : "Group"}
                      </span>
                      {item.status === "PUBLISHED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-800 uppercase">
                          <CheckCircle2 className="h-3 w-3" />
                          Published
                        </span>
                      ) : item.status === "NEED_REVISION" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-900 uppercase">
                          <CheckCircle2 className="h-3 w-3" />
                          Revision requested
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-700">{item.title}</p>
                    {members.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {visibleMembers.map((member) => {
                          const href = getPublicProfileHref({
                            id: member.userId,
                            nim: member.nim,
                            role: "STUDENT",
                          });
                          return (
                            <li key={member.userId} className="flex min-w-0 items-center gap-2">
                              <Link
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 rounded-full transition hover:opacity-90"
                                aria-label={`Open ${member.name} public profile`}
                              >
                                <UserAvatar name={member.name} image={member.image} size="sm" />
                              </Link>
                              <div className="min-w-0">
                                <Link
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block truncate text-xs font-semibold text-sky-700 underline-offset-2 hover:underline"
                                >
                                  {member.name}
                                </Link>
                                {member.nim ? (
                                  <p className="truncate text-[11px] text-slate-500">{member.nim}</p>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                        {extraCount > 0 ? (
                          <li className="pl-8 text-[11px] font-medium text-slate-500">
                            +{extraCount} more member{extraCount === 1 ? "" : "s"}
                          </li>
                        ) : null}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">No members listed</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      {item.grade != null && item.maxScore != null ? (
                        <span className="font-semibold text-slate-700">
                          Score {item.grade}/{item.maxScore}
                        </span>
                      ) : null}
                      <span>Updated {formatWhen(item.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${statusTone(item.status)}`}
                    >
                      {PROJECT_STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-inkcuba-cyan hover:bg-sky-600"
                      onClick={() => onOpenProject(item.id)}
                    >
                      {item.canModerate ? "Review" : "Open"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <SubmissionPager
            page={listQuery.data.page}
            pageSize={listQuery.data.pageSize}
            total={listQuery.data.total}
            totalPages={listQuery.data.totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function statusTone(status: ProjectStatus) {
  if (status === "SUBMITTED" || status === "REVISED") return "bg-sky-100 text-sky-800";
  if (status === "IN_REVIEW") return "bg-violet-100 text-violet-800";
  if (status === "NEED_REVISION") return "bg-amber-100 text-amber-900";
  if (status === "PUBLISHED") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

function formatWhen(value: string) {
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
