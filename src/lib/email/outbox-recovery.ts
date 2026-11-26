import "server-only";

import { and, asc, eq, inArray, lt, or } from "drizzle-orm";

import { db } from "@/db";
import { projectEmailOutbox } from "@/db/schema/portfolios";
import { workspaceEmailOutbox } from "@/db/schema/workspaces";
import { logger } from "@/lib/logger";
import { enqueueProjectEmail } from "@/lib/queues/project-queues";
import { enqueueInviteEmail } from "@/lib/queues/workspace-queues";

const PROJECT_MAX_ATTEMPTS = 5;
const INVITE_MAX_ATTEMPTS = 5;
const BATCH_LIMIT = 40;
/** Give the primary enqueue a moment before the worker requeues. */
const STALE_PENDING_MS = 20_000;
const STALE_FAILED_MS = 45_000;

/**
 * Re-queue stuck project + workspace invite outbox rows.
 * Covers Redis blips and historical enqueue bugs (e.g. BullMQ job ids with `:`).
 */
export async function recoverStuckEmailOutboxes(): Promise<{
  project: number;
  invite: number;
}> {
  const now = Date.now();
  const pendingBefore = new Date(now - STALE_PENDING_MS);
  const failedBefore = new Date(now - STALE_FAILED_MS);

  let project = 0;
  let invite = 0;

  const projectRows = await db
    .select({
      id: projectEmailOutbox.id,
      status: projectEmailOutbox.status,
    })
    .from(projectEmailOutbox)
    .where(
      and(
        inArray(projectEmailOutbox.status, ["PENDING", "FAILED"]),
        lt(projectEmailOutbox.attempts, PROJECT_MAX_ATTEMPTS),
        or(
          and(
            eq(projectEmailOutbox.status, "PENDING"),
            lt(projectEmailOutbox.createdAt, pendingBefore),
          ),
          and(
            eq(projectEmailOutbox.status, "FAILED"),
            lt(projectEmailOutbox.updatedAt, failedBefore),
          ),
        ),
      ),
    )
    .orderBy(asc(projectEmailOutbox.createdAt))
    .limit(BATCH_LIMIT);

  for (const row of projectRows) {
    try {
      if (row.status === "FAILED") {
        await db
          .update(projectEmailOutbox)
          .set({ status: "PENDING", lastError: null })
          .where(eq(projectEmailOutbox.id, row.id));
      }
      await enqueueProjectEmail({ outboxId: row.id });
      project += 1;
    } catch (error) {
      logger.warn(
        { err: error, outboxId: row.id },
        "Project email recovery enqueue failed",
      );
    }
  }

  const inviteRows = await db
    .select({
      id: workspaceEmailOutbox.id,
      status: workspaceEmailOutbox.status,
    })
    .from(workspaceEmailOutbox)
    .where(
      and(
        inArray(workspaceEmailOutbox.status, ["PENDING", "FAILED"]),
        lt(workspaceEmailOutbox.attempts, INVITE_MAX_ATTEMPTS),
        or(
          and(
            eq(workspaceEmailOutbox.status, "PENDING"),
            lt(workspaceEmailOutbox.createdAt, pendingBefore),
          ),
          and(
            eq(workspaceEmailOutbox.status, "FAILED"),
            lt(workspaceEmailOutbox.updatedAt, failedBefore),
          ),
        ),
      ),
    )
    .orderBy(asc(workspaceEmailOutbox.createdAt))
    .limit(BATCH_LIMIT);

  for (const row of inviteRows) {
    try {
      if (row.status === "FAILED") {
        await db
          .update(workspaceEmailOutbox)
          .set({ status: "PENDING", lastError: null })
          .where(eq(workspaceEmailOutbox.id, row.id));
      }
      await enqueueInviteEmail({ outboxId: row.id });
      invite += 1;
    } catch (error) {
      logger.warn(
        { err: error, outboxId: row.id },
        "Invite email recovery enqueue failed",
      );
    }
  }

  if (project > 0 || invite > 0) {
    logger.info({ project, invite }, "Email outbox recovery re-queued jobs");
  }

  return { project, invite };
}
