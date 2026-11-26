"use client";

import { ClipboardCheck, Gavel, ListChecks } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  ProjectScoringSheet,
  type ProjectScoringSheetData,
} from "@/components/projects/project-scoring-sheet";
import {
  SubmissionRubricView,
  type SubmissionRubricViewComponent,
} from "@/components/projects/submission-rubric-view";
import { cn } from "@/lib/utils";

export type AssessmentTab = "moderation" | "rubric" | "results";

export function ProjectAssessmentPanel({
  rubric,
  maxScore,
  scoreSheet,
  className,
  defaultTab,
  moderation,
  moderationBadge,
}: {
  rubric: SubmissionRubricViewComponent[];
  maxScore: number;
  scoreSheet: ProjectScoringSheetData | null;
  className?: string;
  /** Prefer results when a sheet already exists (e.g. published). */
  defaultTab?: AssessmentTab;
  /** Lecturer-only: moderation / scoring form. */
  moderation?: ReactNode;
  moderationBadge?: { label: string; tone: "ready" | "pending" | "action" };
}) {
  const hasResults = Boolean(scoreSheet);
  const hasModeration = moderation != null;
  const [tab, setTab] = useState<AssessmentTab>(() => {
    if (defaultTab === "moderation" && hasModeration) return "moderation";
    if (defaultTab === "results") return "results";
    if (defaultTab === "rubric") return "rubric";
    if (hasModeration) return "moderation";
    return hasResults ? "results" : "rubric";
  });

  if (!rubric.length && !hasResults && !hasModeration) return null;

  return (
    <section className={cn("space-y-3", className)}>
      <div
        role="tablist"
        aria-label="Assessment"
        className="relative z-10 flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-100/80 p-1"
      >
        {hasModeration ? (
          <TabButton
            id="assessment-tab-moderation"
            active={tab === "moderation"}
            onClick={() => setTab("moderation")}
            icon={<Gavel className="h-3.5 w-3.5" aria-hidden />}
            label="Moderation"
            badge={moderationBadge?.label}
            badgeTone={moderationBadge?.tone ?? "action"}
          />
        ) : null}
        <TabButton
          id="assessment-tab-rubric"
          active={tab === "rubric"}
          onClick={() => setTab("rubric")}
          icon={<ListChecks className="h-3.5 w-3.5" aria-hidden />}
          label="Scoring rubric"
        />
        <TabButton
          id="assessment-tab-results"
          active={tab === "results"}
          onClick={() => setTab("results")}
          icon={<ClipboardCheck className="h-3.5 w-3.5" aria-hidden />}
          label="Scoring results"
          badge={hasResults ? "Ready" : "Pending"}
          badgeTone={hasResults ? "ready" : "pending"}
        />
      </div>

      <div
        role="tabpanel"
        id={
          tab === "moderation"
            ? "assessment-panel-moderation"
            : tab === "rubric"
              ? "assessment-panel-rubric"
              : "assessment-panel-results"
        }
        aria-labelledby={
          tab === "moderation"
            ? "assessment-tab-moderation"
            : tab === "rubric"
              ? "assessment-tab-rubric"
              : "assessment-tab-results"
        }
        className="animate-in fade-in-0 duration-200"
      >
        {tab === "moderation" ? (
          moderation
        ) : tab === "rubric" ? (
          rubric.length > 0 ? (
            <SubmissionRubricView components={rubric} maxScore={maxScore} compact />
          ) : (
            <EmptyState message="No scoring rubric is attached to this submission yet." />
          )
        ) : scoreSheet ? (
          <div className="max-h-[min(36rem,70vh)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
            <ProjectScoringSheet sheet={scoreSheet} />
          </div>
        ) : (
          <EmptyState
            message="No scoring results yet."
            hint="Results appear after Publish. Revision requests only store feedback—no score sheet. Layout follows the scoring mode (individual, group only, or group + individual)."
          />
        )}
      </div>
    </section>
  );
}

function TabButton({
  id,
  active,
  onClick,
  icon,
  label,
  badge,
  badgeTone,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: string;
  badgeTone?: "ready" | "pending" | "action";
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all sm:flex-none sm:px-4",
        active
          ? "bg-inkcuba-navy text-white shadow-sm"
          : "text-slate-600 hover:bg-white hover:text-inkcuba-navy",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      {badge ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase",
            active
              ? "bg-white/15 text-white"
              : badgeTone === "ready"
                ? "bg-emerald-100 text-emerald-800"
                : badgeTone === "action"
                  ? "bg-sky-100 text-sky-800"
                  : "bg-slate-200 text-slate-600",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{message}</p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}
