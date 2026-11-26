"use client";

import {
  CheckCircle2,
  ClipboardCheck,
  Scale,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";

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
  INDIVIDUAL: "Individual submission",
  GROUP_ONLY: "Group only",
  GROUP_AND_INDIVIDUAL: "Group + individual",
};

const MODE_HINT: Record<ProjectScoringMode, string> = {
  INDIVIDUAL: "One rubric pass for this student project.",
  GROUP_ONLY: "One shared rubric score applies to every group member.",
  GROUP_AND_INDIVIDUAL:
    "Group rubric is blended with each student’s own rubric scores by weight.",
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

function ComponentRows({
  components,
  emptyLabel,
}: {
  components: ProjectScoringSheetComponent[] | ProjectScoringSheetMemberComponent[];
  emptyLabel: string;
}) {
  if (components.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-slate-500">{emptyLabel}</p>;
  }
  return (
    <ul className="max-h-[min(18rem,40vh)] divide-y divide-slate-100 overflow-y-auto overscroll-contain">
      {components.map((component, index) => (
        <li
          key={`${component.name}-${index}`}
          className="flex flex-wrap items-start justify-between gap-2 px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900">{component.name}</p>
            {component.description ? (
              <p className="mt-0.5 whitespace-pre-line text-xs text-slate-500">
                {component.description}
              </p>
            ) : null}
            <p className="mt-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              {formatScore(component.weightPercent)}% · max {formatScore(component.maxPoints)}
            </p>
          </div>
          <p className="shrink-0 text-sm font-bold text-inkcuba-navy">
            {formatScore(component.score)}
            <span className="font-medium text-slate-500">
              {" "}
              / {formatScore(component.maxPoints)}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}

export function ProjectScoringSheet({
  sheet,
  className,
}: {
  sheet: ProjectScoringSheetData;
  className?: string;
}) {
  const isIndividual = sheet.scoringMode === "INDIVIDUAL";
  const isGroupOnly = sheet.scoringMode === "GROUP_ONLY";
  const isSplit = sheet.scoringMode === "GROUP_AND_INDIVIDUAL";
  const [openMemberId, setOpenMemberId] = useState<string | null>(
    () => sheet.members[0]?.userId ?? null,
  );

  const headlineScore =
    isSplit
      ? null
      : (sheet.finalGrade ?? sheet.groupTotal);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-sky-50/70 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Published scores
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-inkcuba-navy/5 px-3 py-1 text-xs font-semibold text-inkcuba-navy">
                {isIndividual ? (
                  <UserRound className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Users className="h-3.5 w-3.5" aria-hidden />
                )}
                {MODE_LABEL[sheet.scoringMode]}
              </span>
            </div>
            <p className="text-sm text-slate-600">{MODE_HINT[sheet.scoringMode]}</p>
            {isSplit ? (
              <p className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-950">
                <Scale className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Blend {formatScore(sheet.groupPercent)}% group +{" "}
                {formatScore(sheet.individualPercent)}% individual
              </p>
            ) : null}
          </div>
          <div className="text-right">
            {headlineScore != null ? (
              <>
                <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                  {isIndividual ? "Final score" : "Shared group score"}
                </p>
                <p className="font-heading text-2xl font-bold text-emerald-700">
                  {formatScore(headlineScore)}
                  <span className="text-base font-semibold text-slate-500">
                    {" "}
                    / {formatScore(sheet.maxScore)}
                  </span>
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                  Group total
                </p>
                <p className="font-heading text-2xl font-bold text-inkcuba-navy">
                  {formatScore(sheet.groupTotal)}
                  <span className="text-base font-semibold text-slate-500">
                    {" "}
                    / {formatScore(sheet.maxScore)}
                  </span>
                </p>
              </>
            )}
            <time dateTime={sheet.createdAt} className="mt-1 block text-xs text-slate-500">
              {formatWhen(sheet.createdAt)}
            </time>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h3 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 font-heading text-sm font-bold text-inkcuba-navy">
          <ClipboardCheck className="h-4 w-4 text-inkcuba-cyan" aria-hidden />
          {isIndividual ? "Rubric scores" : "Group rubric scores"}
        </h3>
        <ComponentRows
          components={sheet.components}
          emptyLabel="No rubric components recorded."
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">
            {isIndividual ? "Project total" : "Group total"}
          </span>
          <span className="text-sm font-bold text-inkcuba-navy">
            {formatScore(sheet.groupTotal)}
            <span className="font-medium text-slate-500"> / {formatScore(sheet.maxScore)}</span>
          </span>
        </div>
      </section>

      {isGroupOnly && sheet.members.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-inkcuba-navy">
            <Users className="h-4 w-4 text-inkcuba-cyan" aria-hidden />
            Members receive the same score
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Group-only mode assigns the group total to every member as their final grade.
          </p>
          <ul className="mt-3 max-h-[min(16rem,35vh)] space-y-2 overflow-y-auto overscroll-contain">
            {sheet.members.map((member) => (
              <li
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5"
              >
                <p className="min-w-0 text-sm font-semibold text-slate-900">{member.name}</p>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Final {formatScore(member.finalGrade)} / {formatScore(sheet.maxScore)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isSplit && sheet.members.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-inkcuba-navy">
                <Users className="h-4 w-4 text-inkcuba-cyan" aria-hidden />
                Individual member scores
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Final = group total × {formatScore(sheet.groupPercent)}% + individual total ×{" "}
                {formatScore(sheet.individualPercent)}%.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {sheet.members.length} {sheet.members.length === 1 ? "member" : "members"}
            </span>
          </div>

          <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto overscroll-contain px-1 pb-1">
            {sheet.members.map((member) => {
              const selected = openMemberId === member.userId;
              return (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => setOpenMemberId(member.userId)}
                  className={cn(
                    "inline-flex shrink-0 cursor-pointer flex-col rounded-xl border px-3 py-2 text-left transition",
                    selected
                      ? "border-inkcuba-navy bg-inkcuba-navy text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300",
                  )}
                >
                  <span className="max-w-[10rem] truncate text-xs font-semibold">{member.name}</span>
                  <span
                    className={cn(
                      "mt-0.5 text-[11px] font-medium",
                      selected ? "text-white/80" : "text-slate-500",
                    )}
                  >
                    Final {formatScore(member.finalGrade)}
                  </span>
                </button>
              );
            })}
          </div>

          {(() => {
            const member =
              sheet.members.find((row) => row.userId === openMemberId) ?? sheet.members[0];
            if (!member) return null;
            return (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                  <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                    <span className="rounded-full bg-white px-2 py-0.5 text-slate-700 ring-1 ring-slate-200">
                      Individual {formatScore(member.individualScore)} /{" "}
                      {formatScore(sheet.maxScore)}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
                      Final {formatScore(member.finalGrade)} / {formatScore(sheet.maxScore)}
                    </span>
                  </div>
                </div>
                {member.components && member.components.length > 0 ? (
                  <ComponentRows
                    components={member.components}
                    emptyLabel="No individual component scores."
                  />
                ) : (
                  <p className="px-3 py-4 text-xs text-slate-500">
                    Individual total {formatScore(member.individualScore)} (component breakdown not
                    available for this sheet).
                  </p>
                )}
              </div>
            );
          })()}
        </section>
      ) : null}

      {isIndividual && sheet.members.length === 1 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Scored for{" "}
          <span className="font-semibold text-slate-900">{sheet.members[0]?.name}</span>.
        </p>
      ) : null}

      {sheet.groupFeedback ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-heading text-sm font-bold text-inkcuba-navy">Lecturer feedback</h3>
          <div
            className="inkcuba-rich-text-content prose prose-sm mt-2 max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: sheet.groupFeedback }}
          />
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
