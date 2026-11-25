"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Award, ClipboardList } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { LecturerProjectReviewPanel } from "@/components/lecturer/workspaces/scoring/lecturer-project-review-panel";
import { LecturerScoringProjectsPanel } from "@/components/lecturer/workspaces/scoring/lecturer-scoring-projects-panel";
import { ScoringSubmissionToolbar } from "@/components/lecturer/workspaces/scoring/scoring-submission-toolbar";
import { Button } from "@/components/ui/button";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { SubmissionPager } from "@/components/workspaces/submission-pager";
import { readApiJson } from "@/lib/api/read-response";
import type { LecturerScoringSubmissionSortField } from "@/lib/projects/validators";

type ScoringSubmissionList = {
  items: Array<{
    id: string;
    title: string;
    type: "INDIVIDUAL" | "GROUP";
    status: "ACTIVE" | "CLOSED" | "DRAFT";
    maxScore: number;
    updatedAt: string;
    awaitingReview: number;
    needRevision: number;
    published: number;
    scoreable: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function LecturerScoringTab({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  const scoringSubmissionId = searchParams.get("scoringSubmission");

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [type, setType] = useState("ALL");
  const [sortBy, setSortBy] = useState<LecturerScoringSubmissionSortField>("awaitingReview");
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

  function setParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "scoring");
    mutate(params);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function openSubmission(id: string) {
    setParams((params) => {
      params.set("scoringSubmission", id);
      params.delete("project");
      params.delete("scoreStatus");
      params.delete("submission");
      params.delete("submissionTitle");
    });
  }

  function clearSubmission() {
    setParams((params) => {
      params.delete("scoringSubmission");
      params.delete("project");
    });
  }

  function openProject(id: string) {
    setParams((params) => {
      params.set("project", id);
      if (scoringSubmissionId) params.set("scoringSubmission", scoringSubmissionId);
    });
  }

  function clearProject() {
    setParams((params) => {
      params.delete("project");
    });
  }

  const listQuery = useQuery({
    queryKey: [
      "lecturer-scoring-submissions",
      workspaceId,
      page,
      pageSize,
      debouncedQ,
      type,
      sortBy,
      sortDir,
    ],
    enabled: !scoringSubmissionId && !projectId,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const search = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: debouncedQ,
        type,
        sortBy,
        sortDir,
      });
      const response = await fetch(
        `/api/lecturer/workspaces/${workspaceId}/scoring/submissions?${search}`,
      );
      return readApiJson<ScoringSubmissionList>(response, "Unable to load scoring submissions");
    },
  });

  const submissionMetaQuery = useQuery({
    queryKey: ["lecturer-scoring-submission-meta", workspaceId, scoringSubmissionId],
    enabled: Boolean(scoringSubmissionId),
    queryFn: async () => {
      const response = await fetch(
        `/api/lecturer/workspaces/${workspaceId}/submissions/${scoringSubmissionId}`,
      );
      const data = await readApiJson<{ submission: { title: string; maxScore: number } }>(
        response,
        "Unable to load scoring submission",
      );
      return data.submission;
    },
  });

  const submissionMeta = submissionMetaQuery.data ?? null;

  if (projectId) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="outline" className="border-slate-900" onClick={clearProject}>
          <ArrowLeft className="h-4 w-4" />
          {scoringSubmissionId ? "Back to projects" : "All scoring slots"}
        </Button>
        <LecturerProjectReviewPanel
          workspaceId={workspaceId}
          portfolioId={projectId}
          onDone={clearProject}
          onNavigateProject={openProject}
        />
      </div>
    );
  }

  if (scoringSubmissionId) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="outline" className="border-slate-900" onClick={clearSubmission}>
          <ArrowLeft className="h-4 w-4" />
          All scoring slots
        </Button>
        {submissionMetaQuery.isLoading && !submissionMeta ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <InkcubaLoader label="Loading submission…" />
          </div>
        ) : (
          <LecturerScoringProjectsPanel
            workspaceId={workspaceId}
            submissionId={scoringSubmissionId}
            submissionTitle={submissionMeta?.title ?? "Submission"}
            maxScore={submissionMeta?.maxScore ?? null}
            onOpenProject={openProject}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-bold text-slate-900">Scoring</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Open a submission to review and score the projects students have submitted.
        </p>
      </div>

      <ScoringSubmissionToolbar
        q={q}
        onQChange={setQ}
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
        hasFilters={Boolean(debouncedQ) || type !== "ALL"}
        activeFilterCount={(debouncedQ ? 1 : 0) + (type !== "ALL" ? 1 : 0)}
        onClear={() => {
          setQ("");
          setDebouncedQ("");
          setType("ALL");
          setPage(1);
        }}
      />

      {listQuery.isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <InkcubaLoader label="Loading scoring slots…" />
        </div>
      ) : listQuery.isError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {listQuery.error instanceof Error ? listQuery.error.message : "Unable to load scoring slots"}
        </p>
      ) : listQuery.data && listQuery.data.items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 font-heading text-lg font-bold text-slate-900">No scoring slots yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            {debouncedQ || type !== "ALL"
              ? "Nothing matches these filters."
              : "Publish a submission in the Submission tab. When students submit projects, open that slot here to score."}
          </p>
        </div>
      ) : listQuery.data ? (
        <>
          <ul className="space-y-3">
            {listQuery.data.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openSubmission(item.id)}
                  className="group flex w-full flex-col gap-4 rounded-2xl border-2 border-slate-900 bg-white p-4 text-left shadow-sm transition hover:border-inkcuba-cyan hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${
                          item.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold tracking-wide text-slate-700 uppercase">
                        {item.type === "GROUP" ? "Group" : "Individual"}
                      </span>
                      {item.awaitingReview > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold tracking-wide text-sky-900 uppercase">
                          <Award className="h-3 w-3" />
                          {item.awaitingReview} ready
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 font-heading text-xl font-bold text-slate-900 group-hover:text-inkcuba-navy">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">Max score {item.maxScore}</p>
                    <dl className="mt-3 grid grid-cols-3 gap-2 sm:max-w-md">
                      <Stat label="Ready" value={item.awaitingReview} emphasize={item.awaitingReview > 0} />
                      <Stat label="Revision" value={item.needRevision} />
                      <Stat label="Published" value={item.published} />
                    </dl>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-inkcuba-cyan px-4 py-2 text-sm font-semibold text-white sm:self-center">
                    Score projects
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </li>
            ))}
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

function Stat({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-2.5 py-2 ${
        emphasize ? "border border-sky-200 bg-sky-50" : "border border-slate-200 bg-slate-50"
      }`}
    >
      <dt className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 font-heading text-lg font-bold text-slate-900">{value}</dd>
    </div>
  );
}
