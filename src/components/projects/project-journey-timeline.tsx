"use client";

import {
  Archive,
  Check,
  CheckCircle2,
  FileEdit,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";

import { formatJourneyWhen } from "@/lib/projects/journey";
import { cn } from "@/lib/utils";

type StageKey =
  | "draft"
  | "submitted"
  | "in_review"
  | "revision"
  | "resubmitted"
  | "published"
  | "archived";

type StageState = "done" | "current" | "upcoming";

type Stage = {
  key: StageKey;
  label: string;
  icon: LucideIcon;
  state: StageState;
};

export type ProjectJourneyTimelineProps = {
  status: string;
  hasRevisionHistory?: boolean;
  hasResubmitted?: boolean;
  /** ISO timestamps of the latest occurrence of each stage. */
  stageTimestamps?: Partial<Record<StageKey, string | null>>;
  className?: string;
};

const STAGE_META: Record<StageKey, { label: string; icon: LucideIcon }> = {
  draft: { label: "Draft", icon: FileEdit },
  submitted: { label: "Submitted", icon: Send },
  in_review: { label: "In review", icon: Search },
  revision: { label: "Revision", icon: RotateCcw },
  resubmitted: { label: "Resubmitted", icon: RefreshCw },
  published: { label: "Published", icon: CheckCircle2 },
  archived: { label: "Archived", icon: Archive },
};

function currentStageKey(status: string): StageKey {
  switch (status) {
    case "SUBMITTED":
      return "submitted";
    case "IN_REVIEW":
      return "in_review";
    case "NEED_REVISION":
      return "revision";
    case "REVISED":
      return "resubmitted";
    case "PUBLISHED":
      return "published";
    case "ARCHIVED":
      return "archived";
    case "DRAFT":
    default:
      return "draft";
  }
}

export function buildJourneyStages({
  status,
  hasRevisionHistory,
  hasResubmitted,
}: Pick<
  ProjectJourneyTimelineProps,
  "status" | "hasRevisionHistory" | "hasResubmitted"
>): Stage[] {
  const normalized = status.trim().toUpperCase();
  const current = currentStageKey(normalized);

  const isTerminal = current === "published" || current === "archived";
  // A terminal project that went through revision must have been resubmitted.
  const includeResubmitted =
    Boolean(hasResubmitted) ||
    normalized === "REVISED" ||
    (isTerminal && Boolean(hasRevisionHistory));
  const includeRevision =
    Boolean(hasRevisionHistory) ||
    includeResubmitted ||
    normalized === "NEED_REVISION";

  const keys: StageKey[] = ["draft", "submitted", "in_review"];
  if (includeRevision) keys.push("revision");
  if (includeResubmitted) keys.push("resubmitted");
  keys.push(normalized === "ARCHIVED" ? "archived" : "published");

  const currentIndex = keys.indexOf(current);
  // Status was reached earlier (e.g. IN_REVIEW again after a revision round):
  // conditional stages that already happened are shown as done.
  const reviewedAgain = normalized === "SUBMITTED" || normalized === "IN_REVIEW";

  return keys.map((key, index): Stage => {
    let state: StageState;
    if (index < currentIndex) {
      state = "done";
    } else if (index === currentIndex) {
      state = current === "published" ? "done" : "current";
    } else if (
      reviewedAgain &&
      ((key === "revision" && hasRevisionHistory) ||
        (key === "resubmitted" && hasResubmitted))
    ) {
      state = "done";
    } else {
      state = "upcoming";
    }
    return { key, state, ...STAGE_META[key] };
  });
}

function stageCircleClass(state: StageState, key: StageKey) {
  if (state === "done") return "border-emerald-500 bg-emerald-500 text-white";
  if (state === "current") {
    return key === "revision"
      ? "border-amber-500 bg-amber-500 text-white ring-4 ring-amber-100"
      : "border-inkcuba-navy bg-inkcuba-navy text-white ring-4 ring-inkcuba-cyan/20";
  }
  return "border-slate-300 bg-white text-slate-400";
}

function stageLabelClass(state: StageState) {
  if (state === "done") return "text-emerald-700";
  if (state === "current") return "text-inkcuba-navy font-semibold";
  return "text-slate-400";
}

export function ProjectJourneyTimeline({
  status,
  hasRevisionHistory,
  hasResubmitted,
  stageTimestamps,
  className,
}: ProjectJourneyTimelineProps) {
  const stages = useMemo(
    () => buildJourneyStages({ status, hasRevisionHistory, hasResubmitted }),
    [status, hasRevisionHistory, hasResubmitted],
  );

  const whenFor = (stage: Stage): string | null =>
    stage.state === "upcoming" ? null : formatJourneyWhen(stageTimestamps?.[stage.key]);

  return (
    <nav
      aria-label="Project journey"
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      {/* Desktop: horizontal stepper */}
      <ol className="hidden items-start sm:flex">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isLast = index === stages.length - 1;
          const nextDone = !isLast && stages[index + 1].state !== "upcoming";
          return (
            <li
              key={stage.key}
              className={cn("flex items-start", !isLast && "min-w-0 flex-1")}
              aria-current={stage.state === "current" ? "step" : undefined}
            >
              <div className="flex w-24 shrink-0 flex-col items-center gap-2 text-center">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition",
                    stageCircleClass(stage.state, stage.key),
                  )}
                >
                  {stage.state === "done" ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : (
                    <Icon className="h-4 w-4" aria-hidden />
                  )}
                </span>
                <span className={cn("text-xs leading-tight", stageLabelClass(stage.state))}>
                  {stage.label}
                </span>
                {whenFor(stage) ? (
                  <span className="-mt-1.5 text-[10px] leading-tight text-slate-500">
                    {whenFor(stage)}
                  </span>
                ) : null}
              </div>
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "mt-[17px] h-0.5 min-w-4 flex-1 rounded-full",
                    stage.state === "done" && nextDone ? "bg-emerald-400" : "bg-slate-200",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact vertical list */}
      <ol className="flex flex-col sm:hidden">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isLast = index === stages.length - 1;
          const nextDone = !isLast && stages[index + 1].state !== "upcoming";
          return (
            <li
              key={stage.key}
              className="flex gap-3"
              aria-current={stage.state === "current" ? "step" : undefined}
            >
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                    stageCircleClass(stage.state, stage.key),
                  )}
                >
                  {stage.state === "done" ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
                {!isLast ? (
                  <span
                    aria-hidden
                    className={cn(
                      "my-1 w-0.5 flex-1 min-h-3 rounded-full",
                      stage.state === "done" && nextDone ? "bg-emerald-400" : "bg-slate-200",
                    )}
                  />
                ) : null}
              </div>
              <div className={cn("pb-3 pt-1 text-sm", isLast && "pb-0")}>
                <span className={stageLabelClass(stage.state)}>{stage.label}</span>
                {stage.state === "current" ? (
                  <span className="ml-2 rounded-full bg-inkcuba-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-inkcuba-navy">
                    Now
                  </span>
                ) : null}
                {whenFor(stage) ? (
                  <span className="mt-0.5 block text-xs text-slate-500">{whenFor(stage)}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}