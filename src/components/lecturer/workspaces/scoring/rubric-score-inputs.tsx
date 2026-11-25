"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type RubricScoreRow = {
  id: string;
  name: string;
  description: string | null;
  weightPercent: number;
  maxPoints: number;
};

const LIST_SCROLL_CLASS = "max-h-[min(20rem,45vh)] overflow-y-auto overscroll-contain pr-0.5";

export function RubricScoreInputs({
  rubric,
  values,
  disabled,
  onChange,
  total,
  maxScore,
  dense = false,
}: {
  rubric: RubricScoreRow[];
  values: Record<string, string>;
  disabled?: boolean;
  onChange: (rubricComponentId: string, value: string) => void;
  total: number;
  maxScore: number;
  dense?: boolean;
}) {
  if (rubric.length === 0) {
    return <p className="text-sm text-slate-500">No rubric components are configured.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Rubric components · {rubric.length}
        </span>
        <span
          className={cn(
            "text-xs font-semibold",
            total > maxScore ? "text-red-600" : "text-slate-600",
          )}
        >
          Total {total}/{maxScore}
        </span>
      </div>
      <ul
        className={cn(
          "grid gap-3",
          dense ? "sm:grid-cols-1" : "sm:grid-cols-2",
          rubric.length > 4 ? LIST_SCROLL_CLASS : "",
        )}
      >
        {rubric.map((row) => (
          <li
            key={row.id}
            className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <label className="block">
              <span className="block text-sm font-semibold text-slate-900">
                {row.name}{" "}
                <span className="text-xs font-medium text-slate-500">
                  {row.weightPercent}% · 0 to {row.maxPoints}
                </span>
              </span>
              {row.description ? (
                <span className="mt-0.5 block text-xs text-slate-500">{row.description}</span>
              ) : null}
              <Input
                inputMode="numeric"
                value={values[row.id] ?? ""}
                placeholder={`0–${row.maxPoints}`}
                disabled={disabled}
                className="mt-2 h-10 rounded-xl"
                onChange={(event) => {
                  const digits = event.target.value.replace(/[^\d]/g, "").slice(0, 4);
                  const clamped =
                    digits !== "" && Number(digits) > row.maxPoints
                      ? String(row.maxPoints)
                      : digits;
                  onChange(row.id, clamped);
                }}
              />
            </label>
          </li>
        ))}
      </ul>
      {total > maxScore ? (
        <p className="text-xs font-medium text-red-600">
          Total exceeds the maximum score of {maxScore}.
        </p>
      ) : null}
    </div>
  );
}

export function sumRubricScores(
  rubric: RubricScoreRow[],
  values: Record<string, string>,
): number {
  return rubric.reduce((sum, row) => {
    const value = Number(values[row.id]);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

/** True when every rubric component has a non-empty whole-number value. */
export function isRubricScoresComplete(
  rubric: RubricScoreRow[],
  values: Record<string, string>,
): boolean {
  return rubric.every((row) => {
    const raw = values[row.id] ?? "";
    const score = Number(raw);
    return raw.trim() !== "" && Number.isInteger(score) && score >= 0 && score <= row.maxPoints;
  });
}
