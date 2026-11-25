import "server-only";

import { count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { portfolioEvent } from "@/db/schema/portfolios";
import type { ProjectStatus } from "@/lib/projects/limits";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbLike = typeof db | Tx;

export type PortfolioEventType =
  | "CREATED"
  | "SUBMITTED"
  | "REVIEW_STARTED"
  | "REVISION_REQUESTED"
  | "RESUBMITTED"
  | "PUBLISHED"
  | "ARCHIVED"
  | "UNARCHIVED"
  | "DELETED";

export async function recordPortfolioEvent(
  client: DbLike,
  input: {
    portfolioId: string;
    actorId?: string | null;
    actorRole: "STUDENT" | "LECTURER" | "SYSTEM";
    eventType: PortfolioEventType;
    fromStatus?: ProjectStatus | string | null;
    toStatus?: ProjectStatus | string | null;
    grade?: number | null;
    feedback?: string | null;
    message: string;
    metadata?: Record<string, unknown>;
  },
) {
  await client.insert(portfolioEvent).values({
    id: crypto.randomUUID(),
    portfolioId: input.portfolioId,
    actorId: input.actorId ?? null,
    actorRole: input.actorRole,
    eventType: input.eventType,
    fromStatus: (input.fromStatus as typeof portfolioEvent.$inferInsert.fromStatus) ?? null,
    toStatus: (input.toStatus as typeof portfolioEvent.$inferInsert.toStatus) ?? null,
    grade: input.grade ?? null,
    feedback: input.feedback ?? null,
    message: input.message,
    metadata: input.metadata ?? null,
  });
}

export async function listPortfolioEvents(portfolioId: string) {
  const page = await listPortfolioEventsPage({ portfolioId, page: 1, pageSize: 200 });
  return page.items;
}

export async function listPortfolioEventsPage(input: {
  portfolioId: string;
  page: number;
  pageSize: number;
}) {
  const where = eq(portfolioEvent.portfolioId, input.portfolioId);
  const [totalRow] = await db.select({ value: count() }).from(portfolioEvent).where(where);
  const total = Number(totalRow?.value ?? 0);
  const rows = await db
    .select({
      id: portfolioEvent.id,
      eventType: portfolioEvent.eventType,
      actorRole: portfolioEvent.actorRole,
      actorName: userTable.name,
      fromStatus: portfolioEvent.fromStatus,
      toStatus: portfolioEvent.toStatus,
      grade: portfolioEvent.grade,
      feedback: portfolioEvent.feedback,
      message: portfolioEvent.message,
      metadata: portfolioEvent.metadata,
      createdAt: portfolioEvent.createdAt,
    })
    .from(portfolioEvent)
    .leftJoin(userTable, eq(userTable.id, portfolioEvent.actorId))
    .where(where)
    .orderBy(desc(portfolioEvent.createdAt), desc(portfolioEvent.id))
    .limit(input.pageSize)
    .offset((input.page - 1) * input.pageSize);

  return {
    items: rows.map((row) => ({
      id: row.id,
      eventType: row.eventType,
      actorRole: row.actorRole,
      actorName: row.actorName,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      grade: row.grade,
      feedback: row.feedback,
      message: row.message,
      metadata: row.metadata ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    hasMore: input.page * input.pageSize < total,
  };
}
