import "server-only";

import { and, asc, eq, lt } from "drizzle-orm";

import { db } from "@/db";
import { workspaceImportJob } from "@/db/schema/workspaces";
import { logger } from "@/lib/logger";
import { enqueueImportJob } from "@/lib/queues/workspace-queues";

const STALE_COMMITTING_MS = 2 * 60 * 1000;
const BATCH_LIMIT = 20;

/**
 * Re-queue Excel import commits that stayed COMMITTING after a worker/Redis blip.
 * Safe with stable BullMQ job ids (add-or-reuse) — will not double-run an active job.
 */
export async function recoverStuckImportJobs(): Promise<number> {
  const staleBefore = new Date(Date.now() - STALE_COMMITTING_MS);
  const rows = await db
    .select({
      id: workspaceImportJob.id,
      workspaceId: workspaceImportJob.workspaceId,
      lecturerId: workspaceImportJob.lecturerId,
    })
    .from(workspaceImportJob)
    .where(
      and(
        eq(workspaceImportJob.status, "COMMITTING"),
        lt(workspaceImportJob.updatedAt, staleBefore),
      ),
    )
    .orderBy(asc(workspaceImportJob.updatedAt))
    .limit(BATCH_LIMIT);

  let recovered = 0;
  for (const row of rows) {
    try {
      await enqueueImportJob("commit-import", {
        jobId: row.id,
        workspaceId: row.workspaceId,
        lecturerId: row.lecturerId,
      });
      // Touch updatedAt so we do not thrash the same row every sweep if Redis is down.
      await db
        .update(workspaceImportJob)
        .set({ updatedAt: new Date() })
        .where(eq(workspaceImportJob.id, row.id));
      recovered += 1;
    } catch (error) {
      logger.warn(
        { err: error, jobId: row.id },
        "Import commit recovery enqueue failed",
      );
    }
  }

  if (recovered > 0) {
    logger.info({ recovered }, "Import commit recovery re-queued jobs");
  }
  return recovered;
}
