"use client";

import { ListChecks, Percent, Target } from "lucide-react";

import { cn } from "@/lib/utils";

export type SubmissionRubricViewComponent = {
  name: string;
  description: string | null;
  weightPercent: number;
  maxPoints: number;
};

function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

/** Cap list height so long rubrics stay inside a scroll region instead of stretching the page. */
const LIST_SCROLL_CLASS = "max-h-[min(22rem,50vh)] overflow-y-auto overscroll-contain";

export function SubmissionRubricView({
  components,
  maxScore,
  className,
  compact = false,
}: {
  components: SubmissionRubricViewComponent[];
  maxScore: number;
  className?: string;
  /** Tighter spacing for nested panels (e.g. student tabs). */
  compact?: boolean;
}) {
  const totalWeight = components.reduce((sum, row) => sum + row.weightPercent, 0);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-sky-50/60",
          compact ? "px-4 py-3" : "px-4 py-4 sm:px-5",
        )}
      >
        <div className="min-w-0 space-y-1">
          <h3 className="flex items-center gap-2 font-heading text-base font-bold text-inkcuba-navy">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-200 bg-white text-inkcuba-cyan shadow-sm">
              <ListChecks className="h-4 w-4" aria-hidden />
            </span>
            Scoring rubric
          </h3>
          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            Component weights define how the maximum score is shared across criteria.
            {components.length > 6
              ? " Long rubrics scroll inside this panel."
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-inkcuba-navy px-3 py-1 text-xs font-semibold text-white">
            <Target className="h-3.5 w-3.5" aria-hidden />
            Max {formatPoints(maxScore)} pts
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <Percent className="h-3.5 w-3.5" aria-hidden />
            {formatPoints(totalWeight)}% · {components.length}{" "}
            {components.length === 1 ? "component" : "components"}
          </span>
        </div>
      </div>

      {components.length === 0 ? (
        <p className="m-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          No rubric defined for this submission.
        </p>
      ) : (
        <ol className={cn("divide-y divide-slate-100", LIST_SCROLL_CLASS)}>
          {components.map((component, index) => (
            <li
              key={`${component.name}-${index}`}
              className={cn(
                "grid gap-3 transition-colors hover:bg-slate-50/80 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start",
                compact ? "px-4 py-3" : "px-4 py-4 sm:px-5",
              )}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-inkcuba-navy text-sm font-bold text-white"
                aria-hidden
              >
                {index + 1}
              </span>
              <div className="min-w-0 space-y-1.5">
                <p className="font-heading text-sm font-bold text-slate-900 sm:text-[15px]">
                  {component.name}
                </p>
                {component.description ? (
                  <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {component.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No description provided.</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1.5 sm:flex-col sm:items-end">
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-inkcuba-navy ring-1 ring-sky-200">
                  {formatPoints(component.weightPercent)}%
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {formatPoints(component.maxPoints)} pts
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
