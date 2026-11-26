import "dotenv/config";

import { Worker } from "bullmq";

import {
  getBullConnectionOptions,
  WORKSPACE_IMPORT_QUEUE,
  WORKSPACE_INVITE_EMAIL_QUEUE,
  type WorkspaceImportJobData,
  type WorkspaceImportJobName,
  type WorkspaceInviteEmailJobData,
} from "../src/lib/queues/workspace-queues";
import {
  PROJECT_EMAIL_QUEUE,
  type ProjectEmailJobData,
} from "../src/lib/queues/project-queues";
import { processImportCommitJob } from "../src/lib/workspaces/members/import-service";
import { recoverStuckImportJobs } from "../src/lib/workspaces/members/import-recovery";
import { processInviteEmailOutbox } from "../src/lib/email/services/workspace-invite";
import { processProjectEmailOutbox } from "../src/lib/email/services/project-notify";
import { recoverStuckEmailOutboxes } from "../src/lib/email/outbox-recovery";

const RECOVERY_INTERVAL_MS = 60_000;

function envInt(name: string, fallback: number, min = 1, max = 32) {
  const raw = Number(process.env[name] || fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(raw)));
}

async function main() {
  const connection = getBullConnectionOptions();
  const importConcurrency = envInt("WORKER_IMPORT_CONCURRENCY", 2);
  const emailConcurrency = envInt("WORKER_EMAIL_CONCURRENCY", 8);

  const importWorker = new Worker<
    WorkspaceImportJobData,
    void,
    WorkspaceImportJobName
  >(
    WORKSPACE_IMPORT_QUEUE,
    async (job) => {
      if (job.name === "commit-import") {
        await processImportCommitJob(job.data);
        return;
      }
      console.log(`[import] skipped job name=${job.name} id=${job.id}`);
    },
    {
      connection,
      concurrency: importConcurrency,
      // Large Excel commits loop chunks + invite outbox in one job.
      lockDuration: envInt("WORKER_IMPORT_LOCK_MS", 300_000, 60_000, 900_000),
    },
  );

  const emailWorker = new Worker<WorkspaceInviteEmailJobData>(
    WORKSPACE_INVITE_EMAIL_QUEUE,
    async (job) => {
      await processInviteEmailOutbox(job.data.outboxId);
    },
    {
      connection,
      concurrency: emailConcurrency,
      lockDuration: envInt("WORKER_EMAIL_LOCK_MS", 60_000, 30_000, 300_000),
    },
  );

  const projectEmailWorker = new Worker<ProjectEmailJobData>(
    PROJECT_EMAIL_QUEUE,
    async (job) => {
      await processProjectEmailOutbox(job.data.outboxId);
    },
    {
      connection,
      concurrency: emailConcurrency,
      lockDuration: envInt("WORKER_EMAIL_LOCK_MS", 60_000, 30_000, 300_000),
    },
  );

  const onWorkerError = (label: string) => (err: Error) => {
    console.error(`[${label}] error`, err.message);
  };

  importWorker.on("failed", (job, err) => {
    console.error("[import-worker] failed", job?.id, err.message);
  });
  emailWorker.on("failed", (job, err) => {
    console.error("[email-worker] failed", job?.id, err.message);
  });
  projectEmailWorker.on("failed", (job, err) => {
    console.error("[project-email-worker] failed", job?.id, err.message);
  });
  importWorker.on("error", onWorkerError("import-worker"));
  emailWorker.on("error", onWorkerError("email-worker"));
  projectEmailWorker.on("error", onWorkerError("project-email-worker"));

  const runRecovery = async () => {
    try {
      const [email, imports] = await Promise.all([
        recoverStuckEmailOutboxes(),
        recoverStuckImportJobs(),
      ]);
      if (email.project > 0 || email.invite > 0 || imports > 0) {
        console.log(
          `[workspace-worker] recovery projectEmail=${email.project} inviteEmail=${email.invite} imports=${imports}`,
        );
      }
    } catch (error) {
      console.error("[workspace-worker] recovery failed", error);
    }
  };

  await runRecovery();
  const recoveryTimer = setInterval(() => {
    void runRecovery();
  }, RECOVERY_INTERVAL_MS);
  recoveryTimer.unref?.();

  console.log(
    `[workspace-worker] listening on ${WORKSPACE_IMPORT_QUEUE}(c=${importConcurrency}) + ${WORKSPACE_INVITE_EMAIL_QUEUE}(c=${emailConcurrency}) + ${PROJECT_EMAIL_QUEUE}(c=${emailConcurrency})`,
  );

  const shutdown = async () => {
    clearInterval(recoveryTimer);
    await Promise.all([
      importWorker.close(),
      emailWorker.close(),
      projectEmailWorker.close(),
    ]);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("[workspace-worker] fatal", error);
  process.exit(1);
});
