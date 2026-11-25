import { ValidationError } from "@/lib/api/errors";

export type RubricWeightRow = {
  id?: string;
  name: string;
  description?: string | null;
  weightPercent: number;
  sortOrder?: number;
};

/** Distribute maxScore across weights so component maxes sum exactly to maxScore. */
export function allocateComponentMaxPoints(
  weights: number[],
  maxScore: number,
): number[] {
  if (weights.length === 0) return [];
  const raw = weights.map((w) => (w / 100) * maxScore);
  const floors = raw.map((v) => Math.floor(v));
  let remainder = maxScore - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (const item of order) {
    if (remainder <= 0) break;
    result[item.i] += 1;
    remainder -= 1;
  }
  return result;
}

export function assertRubricWeightsComplete(rows: RubricWeightRow[]) {
  if (rows.length < 1) {
    throw new ValidationError("Add at least one rubric component");
  }
  let total = 0;
  for (const [index, row] of rows.entries()) {
    const name = row.name?.trim() ?? "";
    if (name.length < 2 || name.length > 120) {
      throw new ValidationError(
        `Rubric component ${index + 1}: name must be 2–120 characters`,
      );
    }
    if (!Number.isInteger(row.weightPercent) || row.weightPercent < 1 || row.weightPercent > 100) {
      throw new ValidationError(
        `Rubric component ${index + 1}: weight must be a whole percent from 1 to 100`,
      );
    }
    total += row.weightPercent;
  }
  if (total !== 100) {
    throw new ValidationError(`Rubric weights must total 100% (currently ${total}%)`);
  }
}

export function componentMaxMap(
  components: Array<{ id: string; weightPercent: number }>,
  maxScore: number,
): Map<string, number> {
  const maxes = allocateComponentMaxPoints(
    components.map((c) => c.weightPercent),
    maxScore,
  );
  const map = new Map<string, number>();
  components.forEach((c, i) => map.set(c.id, maxes[i] ?? 0));
  return map;
}
