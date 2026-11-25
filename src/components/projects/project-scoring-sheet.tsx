"use client";

import { CheckCircle2, ClipboardCheck, RotateCcw, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ProjectScoringDecision = "PUBLISH" | "REVISION";

export type ProjectScoringMode =
  | "INDIVIDUAL"
  | "GROUP_ONLY"
  | "GROUP_AND_INDIVIDUAL";

export type ProjectScoringSheetComponent = {
  name: string;
  description: string | null;
  weightPercent: number;
  maxPoints: number;
  score: number;
};

export type ProjectScoringSheetMemberComponent = {
  name: string;
  description: string | null;
  weightPercent: number;
  maxPoints: number;
  score: number;
};

export type ProjectScoringSheetMember = {
  userId: string;
  name: string;
  individualScore: number | null;
  finalGrade: number;
  notes: string | null;
  /** Present for GROUP_AND_INDIVIDUAL publishes after migration 0019. */
  components?: ProjectScoringSheetMemberComponent[];
};

export type ProjectScoringSheetData = {
  decision: ProjectScoringDecision;
  scoringMode: ProjectScoringMode;
  groupPercent: number;
  individualPercent: number;
  groupTotal: number;
  finalGrade: number | null;
  /** Must already be sanitized server-side. */
  groupFeedback: string | null;
  maxScore: number;
  createdAt: string;
  components: ProjectScoringSheetComponent[];
  members: ProjectScoringSheetMember[];
};

const MODE_LABEL: Record<ProjectScoringMode, string> = {
  INDIVIDUAL: "Individual only",
  GROUP_ONLY: "Group only",
  GROUP_AND_INDIVIDUAL: "Group + individual",
};

function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
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

export function ProjectScoringSheet({
  sheet,
  className,
}: {
  sheet: ProjectScoringSheetData;
  className?: string;
}) {
  const isPublish = sheet.decision === "PUBLISH";
  const showSplit = sheet.scoringMode === "GROUP_AND_INDIVIDUAL";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              isPublish
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
            )}
          >
            {isPublish ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            )}
            {isPublish ? "Published" : "Revision requested"}
          </span>
          <span className="rounded-full bg-inkcuba-navy/5 px-3 py-1 text-xs font-semibold text-inkcuba-navy">
            {MODE_LABEL[sheet.scoringMode]}
            {showSplit
              ? ` · ${formatScore(sheet.groupPercent)}% group / ${formatScore(sheet.individualPercent)}% individual`
              : ""}
          </span>
        </div>
        <time dateTime={sheet.createdAt} className="text-xs text-slate-500">
          {formatWhen(sheet.createdAt)}
        </time>
      </div>

      {/* Rubric table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h3 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 font-heading text-sm font-bold text-inkcuba-navy">
          <ClipboardCheck className="h-4 w-4 text-inkcuba-cyan" aria-hidden />
          Rubric scores
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Component</th>
                <th className="px-3 py-2 text-right font-semibold">Weight</th>
                <th className="px-3 py-2 text-right font-semibold">Max</th>
                <th className="px-4 py-2 text-right font-semibold">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sheet.components.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No rubric components recorded.
                  </td>
                </tr>
              ) : (
                sheet.components.map((component, index) => (
                  <tr key={`${component.name}-${index}`} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{component.name}</p>
                      {component.description ? (
                        <p className="mt-0.5 whitespace-pre-line text-xs text-slate-500">
                          {component.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatScore(component.weightPercent)}%
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {formatScore(component.maxPoints)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-inkcuba-navy">
                      {formatScore(component.score)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50/80">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-700">
                  Group total
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-inkcuba-navy">
                  {formatScore(sheet.groupTotal)}
                  <span className="font-medium text-slate-500"> / {formatScore(sheet.maxScore)}</span>
                </td>
              </tr>
              {sheet.finalGrade != null ? (
                <tr>
                  <td colSpan={3} className="px-4 pb-3 text-sm font-semibold text-slate-700">
                    Final grade
                  </td>
                  <td className="px-4 pb-3 text-right text-base font-bold text-emerald-700">
                    {formatScore(sheet.finalGrade)}
                    <span className="text-sm font-medium text-slate-500">
                      {" "}
                      / {formatScore(sheet.maxScore)}
                    </span>
                  </td>
                </tr>
              ) : null}
            </tfoot>
          </table>
        </div>
      </section>

      {/* Group feedback (HTML must be sanitized server-side) */}
      {sheet.groupFeedback ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-heading text-sm font-bold text-inkcuba-navy">Group feedback</h3>
          <div
            className="inkcuba-rich-text-content prose prose-sm mt-2 max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: sheet.groupFeedback }}
          />
        </section>
      ) : null}

      {/* Members */}
      {sheet.members.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-inkcuba-navy">
            <Users className="h-4 w-4 text-inkcuba-cyan" aria-hidden />
            Member grades
          </h3>
          <ul className="mt-3 space-y-3">
            {sheet.members.map((member) => (
              <li
                key={member.userId}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 text-sm font-semibold text-slate-900">{member.name}</p>
                  <div className="flex shrink-0 flex-wrap gap-1.5 text-xs font-semibold">
                    {showSplit ? (
                      <span className="rounded-full bg-white px-2 py-0.5 text-slate-700 ring-1 ring-slate-200">
                        Individual {formatScore(member.individualScore)}
                        <span className="font-medium text-slate-500">
                          {" "}
                          / {formatScore(sheet.maxScore)}
                        </span>
                      </span>
                    ) : null}
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
                      Final {formatScore(member.finalGrade)}
                    </span>
                  </div>
                </div>
                {showSplit && member.components && member.components.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 border-t border-slate-200/80 pt-2">
                    {member.components.map((component, index) => (
                      <li
                        key={`${member.userId}-${component.name}-${index}`}
                        className="flex flex-wrap items-start justify-between gap-2 text-xs"
                      >
                        <span className="min-w-0 text-slate-600">
                          <span className="font-medium text-slate-800">{component.name}</span>
                          <span className="text-slate-400"> · {formatScore(component.weightPercent)}%</span>
                        </span>
                        <span className="shrink-0 font-semibold text-inkcuba-navy">
                          {formatScore(component.score)}
                          <span className="font-medium text-slate-500">
                            {" "}
                            / {formatScore(component.maxPoints)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function ProjectScoringSheetDialog({
  open,
  onOpenChange,
  sheet,
  title = "Scoring sheet",
  description = "Rubric breakdown and final grades for this decision.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: ProjectScoringSheetData | null;
  title?: string;
  description?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden border-2 border-slate-900 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-slate-100 px-5 py-4 text-left">
          <DialogTitle className="font-heading text-xl font-bold text-slate-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/50 px-4 py-4 sm:px-5">
          {sheet ? (
            <ProjectScoringSheet sheet={sheet} />
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              No scoring sheet available.
            </p>
          )}
        </div>
        <DialogFooter className="border-t border-slate-100 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            className="border-slate-900"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
