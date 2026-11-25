import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import {
  portfolio,
  portfolioMemberComponentScore,
  portfolioMemberScore,
  portfolioScoreComponent,
  portfolioScoreSheet,
} from "@/db/schema/portfolios";
import { assignmentRubricComponent } from "@/db/schema/workspaces";
import { allocateComponentMaxPoints } from "@/lib/projects/rubric";

export type ScoreSheetMemberComponent = {
  rubricComponentId: string;
  name: string;
  description: string | null;
  weightPercent: number;
  maxPoints: number;
  score: number;
};

export type ScoreSheetView = {
  id: string;
  decision: "PUBLISH" | "REVISION";
  scoringMode: "INDIVIDUAL" | "GROUP_ONLY" | "GROUP_AND_INDIVIDUAL";
  groupPercent: number;
  individualPercent: number;
  groupTotal: number;
  finalGrade: number | null;
  groupFeedback: string | null;
  maxScore: number;
  createdAt: string;
  components: Array<{
    rubricComponentId: string;
    name: string;
    description: string | null;
    weightPercent: number;
    maxPoints: number;
    score: number;
  }>;
  members: Array<{
    userId: string;
    name: string;
    individualScore: number | null;
    finalGrade: number;
    notes: string | null;
    components: ScoreSheetMemberComponent[];
  }>;
};

export async function loadLatestScoreSheet(input: {
  portfolioId: string;
  maxScore: number;
}): Promise<ScoreSheetView | null> {
  const [sheet] = await db
    .select()
    .from(portfolioScoreSheet)
    .where(eq(portfolioScoreSheet.portfolioId, input.portfolioId))
    .orderBy(desc(portfolioScoreSheet.createdAt))
    .limit(1);
  if (!sheet) return null;

  const [components, members, memberComponents] = await Promise.all([
    db
      .select()
      .from(portfolioScoreComponent)
      .where(eq(portfolioScoreComponent.sheetId, sheet.id)),
    db
      .select({
        userId: portfolioMemberScore.userId,
        individualScore: portfolioMemberScore.individualScore,
        finalGrade: portfolioMemberScore.finalGrade,
        notes: portfolioMemberScore.notes,
        name: userTable.name,
      })
      .from(portfolioMemberScore)
      .innerJoin(userTable, eq(userTable.id, portfolioMemberScore.userId))
      .where(eq(portfolioMemberScore.sheetId, sheet.id))
      .orderBy(asc(userTable.name)),
    db
      .select()
      .from(portfolioMemberComponentScore)
      .where(eq(portfolioMemberComponentScore.sheetId, sheet.id)),
  ]);

  const componentsByUser = new Map<string, ScoreSheetMemberComponent[]>();
  for (const row of memberComponents) {
    const list = componentsByUser.get(row.userId) ?? [];
    list.push({
      rubricComponentId: row.rubricComponentId,
      name: row.componentName,
      description: row.componentDescription,
      weightPercent: row.weightPercent,
      maxPoints: row.maxPoints,
      score: row.score,
    });
    componentsByUser.set(row.userId, list);
  }

  return {
    id: sheet.id,
    decision: sheet.decision,
    scoringMode: sheet.scoringMode,
    groupPercent: sheet.groupPercent,
    individualPercent: sheet.individualPercent,
    groupTotal: sheet.groupTotal,
    finalGrade: sheet.finalGrade,
    groupFeedback: sheet.groupFeedback,
    maxScore: input.maxScore,
    createdAt: sheet.createdAt.toISOString(),
    components: components.map((row) => ({
      rubricComponentId: row.rubricComponentId,
      name: row.componentName,
      description: row.componentDescription,
      weightPercent: row.weightPercent,
      maxPoints: row.maxPoints,
      score: row.score,
    })),
    members: members.map((row) => ({
      userId: row.userId,
      name: row.name,
      individualScore: row.individualScore,
      finalGrade: row.finalGrade,
      notes: row.notes,
      components: componentsByUser.get(row.userId) ?? [],
    })),
  };
}

export async function loadAssignmentRubric(assignmentId: string, maxScore: number) {
  const rows = await db
    .select()
    .from(assignmentRubricComponent)
    .where(eq(assignmentRubricComponent.assignmentId, assignmentId))
    .orderBy(asc(assignmentRubricComponent.sortOrder), asc(assignmentRubricComponent.createdAt));
  const maxes = allocateComponentMaxPoints(
    rows.map((row) => row.weightPercent),
    maxScore,
  );
  return rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    weightPercent: row.weightPercent,
    sortOrder: row.sortOrder,
    maxPoints: maxes[index] ?? 0,
  }));
}

/**
 * Blend group and individual totals (both on the 0…maxScore scale) by percent split.
 * GROUP_ONLY / INDIVIDUAL return the group (or sole) total.
 */
export function computeFinalMemberGrade(input: {
  scoringMode: "INDIVIDUAL" | "GROUP_ONLY" | "GROUP_AND_INDIVIDUAL";
  groupTotal: number;
  individualScore: number | null | undefined;
  groupPercent: number;
  individualPercent: number;
  maxScore: number;
}): number {
  if (input.scoringMode === "GROUP_AND_INDIVIDUAL") {
    const individual = input.individualScore ?? 0;
    const blended = Math.round(
      (input.groupTotal * input.groupPercent) / 100 +
        (individual * input.individualPercent) / 100,
    );
    return Math.min(input.maxScore, Math.max(0, blended));
  }
  return Math.min(input.maxScore, Math.max(0, input.groupTotal));
}

export async function loadNeighborProjectIds(input: {
  workspaceId: string;
  assignmentId: string | null;
  portfolioId: string;
  statuses: readonly string[];
}) {
  if (!input.assignmentId) return { previousId: null as string | null, nextId: null as string | null };

  const list = await db
    .select({ id: portfolio.id })
    .from(portfolio)
    .where(
      and(
        eq(portfolio.workspaceId, input.workspaceId),
        eq(portfolio.assignmentId, input.assignmentId),
        inArray(portfolio.status, [...input.statuses] as never),
      ),
    )
    .orderBy(desc(portfolio.updatedAt), desc(portfolio.id));

  const index = list.findIndex((row) => row.id === input.portfolioId);
  if (index < 0) return { previousId: null, nextId: null };
  return {
    previousId: index > 0 ? list[index - 1]!.id : null,
    nextId: index < list.length - 1 ? list[index + 1]!.id : null,
  };
}
