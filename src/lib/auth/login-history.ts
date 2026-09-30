import "server-only";

import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { loginHistory, session as sessionTable } from "@/db/schema";
import { parseUserAgent } from "@/lib/auth/user-agent";
import type {
  LoginHistoryEntry,
  LoginHistoryPage,
} from "@/lib/auth/login-history-types";
import { logger } from "@/lib/logger";

export const LOGIN_HISTORY_RETENTION_DAYS = 7;
export const LOGIN_HISTORY_PAGE_SIZE = 10;

export type { LoginHistoryEntry, LoginHistoryPage };

function retentionCutoff(days = LOGIN_HISTORY_RETENTION_DAYS): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function recordLoginHistory(input: {
  userId: string;
  sessionId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
}): Promise<void> {
  try {
    await db.insert(loginHistory).values({
      id: crypto.randomUUID(),
      userId: input.userId,
      sessionId: input.sessionId,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: input.createdAt ?? new Date(),
    });
  } catch (error) {
    logger.error(
      { err: error, userId: input.userId },
      "Failed to record login history",
    );
  }
}

/** Best-effort prune of rows older than retention window (idempotent). */
export async function pruneExpiredLoginHistory(userId?: string): Promise<void> {
  try {
    const cutoff = retentionCutoff();
    if (userId) {
      await db
        .delete(loginHistory)
        .where(
          and(
            eq(loginHistory.userId, userId),
            lt(loginHistory.createdAt, cutoff),
          ),
        );
      return;
    }

    await db.delete(loginHistory).where(lt(loginHistory.createdAt, cutoff));
  } catch (error) {
    logger.error({ err: error, userId }, "Failed to prune login history");
  }
}

/**
 * Seed history from still-active sessions when the durable log is empty
 * (covers logins that happened before this feature shipped).
 */
async function backfillFromActiveSessions(userId: string): Promise<void> {
  const cutoff = retentionCutoff();
  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginHistory)
    .where(
      and(eq(loginHistory.userId, userId), gte(loginHistory.createdAt, cutoff)),
    );

  if ((existing[0]?.count ?? 0) > 0) return;

  const sessions = await db
    .select({
      id: sessionTable.id,
      ipAddress: sessionTable.ipAddress,
      userAgent: sessionTable.userAgent,
      createdAt: sessionTable.createdAt,
    })
    .from(sessionTable)
    .where(
      and(eq(sessionTable.userId, userId), gte(sessionTable.createdAt, cutoff)),
    );

  if (sessions.length === 0) return;

  await db.insert(loginHistory).values(
    sessions.map((row) => ({
      id: crypto.randomUUID(),
      userId,
      sessionId: row.id,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
    })),
  );
}

export async function getLoginHistoryForUser(input: {
  userId: string;
  currentSessionId?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<LoginHistoryPage> {
  const pageSize = Math.min(
    Math.max(input.pageSize ?? LOGIN_HISTORY_PAGE_SIZE, 1),
    50,
  );
  const page = Math.max(input.page ?? 1, 1);
  const cutoff = retentionCutoff();

  await pruneExpiredLoginHistory(input.userId);
  await backfillFromActiveSessions(input.userId);

  const whereClause = and(
    eq(loginHistory.userId, input.userId),
    gte(loginHistory.createdAt, cutoff),
  );

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginHistory)
    .where(whereClause);

  const total = countRow?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const rows = await db
    .select({
      id: loginHistory.id,
      sessionId: loginHistory.sessionId,
      ipAddress: loginHistory.ipAddress,
      userAgent: loginHistory.userAgent,
      createdAt: loginHistory.createdAt,
    })
    .from(loginHistory)
    .where(whereClause)
    .orderBy(desc(loginHistory.createdAt))
    .limit(pageSize)
    .offset(offset);

  const sessionIds = rows
    .map((row) => row.sessionId)
    .filter((id): id is string => Boolean(id));

  const activeSessionIds = new Set<string>();

  if (sessionIds.length > 0) {
    const active = await db
      .select({ id: sessionTable.id })
      .from(sessionTable)
      .where(
        and(
          eq(sessionTable.userId, input.userId),
          inArray(sessionTable.id, sessionIds),
        ),
      );

    for (const row of active) {
      activeSessionIds.add(row.id);
    }
  }

  const items: LoginHistoryEntry[] = rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
    isCurrent: Boolean(
      input.currentSessionId &&
        row.sessionId &&
        row.sessionId === input.currentSessionId,
    ),
    isActive: Boolean(row.sessionId && activeSessionIds.has(row.sessionId)),
    device: parseUserAgent(row.userAgent),
  }));

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    retentionDays: LOGIN_HISTORY_RETENTION_DAYS,
  };
}
