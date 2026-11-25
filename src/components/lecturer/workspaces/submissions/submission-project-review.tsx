"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { InkcubaLoader } from "@/components/ui/inkcuba-loader";
import { readApiJson } from "@/lib/api/read-response";

type Summary = {
  total: number;
  awaitingReview: number;
  drafts: number;
  needRevision: number;
  published: number;
};

export function SubmissionProjectReview({
  workspaceId,
  submissionId,
}: {
  workspaceId: string;
  submissionId: string;
  submissionTitle?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const query = useQuery({
    queryKey: ["lecturer-submission-projects-summary", workspaceId, submissionId],
    queryFn: async () => {
      const response = await fetch(
        `/api/lecturer/workspaces/${workspaceId}/submissions/${submissionId}/projects`,
      );
      return readApiJson<Summary>(response, "Unable to load scoring summary");
    },
  });

  function openScoring() {
    const params = new URLSearchParams({
      tab: "scoring",
      scoringSubmission: submissionId,
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  const summary = query.data;

  return (
    <section className="rounded-2xl border-2 border-inkcuba-navy bg-white p-4 shadow-inkcuba sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-inkcuba-cyan" />
            <h3 className="font-heading text-lg font-bold text-slate-900">Scoring & moderation</h3>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            Jump straight into Scoring for this submission. Only submitted projects appear there—drafts stay hidden
            until students submit. Open Scoring to review each project with the rubric.
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 bg-inkcuba-cyan hover:bg-sky-600"
          onClick={openScoring}
        >
          Score this submission
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {query.isLoading ? (
        <div className="mt-4 flex justify-center py-4">
          <InkcubaLoader label="Loading summary…" />
        </div>
      ) : query.isError ? (
        <p className="mt-4 text-sm text-red-700">
          {query.error instanceof Error ? query.error.message : "Unable to load scoring summary"}
        </p>
      ) : summary ? (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Ready to score" value={summary.awaitingReview} emphasize />
          <Stat label="Need revision" value={summary.needRevision} />
          <Stat label="Published" value={summary.published} />
          <Stat label="Still drafting" value={summary.drafts} />
        </dl>
      ) : null}
    </section>
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
      className={`rounded-xl px-3 py-2 ${
        emphasize ? "border border-sky-200 bg-sky-50" : "border border-slate-200 bg-slate-50"
      }`}
    >
      <dt className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 font-heading text-xl font-bold text-slate-900">{value}</dd>
    </div>
  );
}
