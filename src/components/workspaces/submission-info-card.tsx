"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarRange, FileUp, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatSubmissionSchedule,
  submissionExcerpt,
  submissionStatusClass,
  submissionStatusLabel,
  submissionTypeLabel,
} from "@/components/workspaces/submission-format";
import { readApiJson } from "@/lib/api/read-response";
import type { SubmissionCurrentCard } from "@/lib/workspaces/submissions/types";

type SubmissionInfoCardProps = {
  endpoint: string;
  onOpen: (submissionId: string) => void;
};

async function fetchCurrent(endpoint: string): Promise<SubmissionCurrentCard> {
  const response = await fetch(endpoint);
  return readApiJson<SubmissionCurrentCard>(response, "Failed to load submission");
}

export function SubmissionInfoCard({ endpoint, onOpen }: SubmissionInfoCardProps) {
  const query = useQuery({
    queryKey: ["workspace-submission-current", endpoint],
    queryFn: () => fetchCurrent(endpoint),
  });

  const current = query.data?.submission ?? null;
  const extra = Math.max(0, (query.data?.activeCount ?? 0) - (current ? 1 : 0));

  return (
    <section className="rounded-2xl border-2 border-inkcuba-navy bg-white p-4 shadow-inkcuba">
      <h2 className="text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">
        Current submission
      </h2>
      {query.isLoading ? (
        <p className="mt-3 text-xs text-slate-500">Loading submission…</p>
      ) : query.isError ? (
        <p className="mt-3 text-xs text-red-600">
          {query.error instanceof Error
            ? query.error.message
            : "Unable to load the current submission"}
        </p>
      ) : !current ? (
        <p className="mt-3 text-sm text-slate-600">
          No active submission yet. Published slots will show up here.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${submissionStatusClass(current.status)}`}
            >
              {submissionStatusLabel(current.status)}
            </span>
            <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-700 uppercase">
              {submissionTypeLabel(current.type)}
            </span>
          </div>
          <p className="font-heading text-sm font-bold text-slate-900">
            {current.title}
          </p>
          <p className="flex items-start gap-1.5 text-xs text-slate-600">
            <CalendarRange className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{formatSubmissionSchedule(current)}</span>
          </p>
          <p className="flex items-center gap-1.5 text-xs text-slate-600">
            <Star className="h-3.5 w-3.5 shrink-0" />
            Max score {current.maxScore}
          </p>
          {submissionExcerpt(current.description) ? (
            <p className="text-xs leading-relaxed text-slate-600">
              {submissionExcerpt(current.description, 120)}
            </p>
          ) : null}
          {extra > 0 ? (
            <p className="text-[11px] font-medium text-inkcuba-navy">
              +{extra} more active submission{extra === 1 ? "" : "s"}
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full border-slate-900"
            onClick={() => onOpen(current.id)}
          >
            <FileUp className="h-3.5 w-3.5" />
            Open submission
          </Button>
        </div>
      )}
    </section>
  );
}
