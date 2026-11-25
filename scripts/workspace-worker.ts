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
import { processInviteEmailOutbox } from "../src/lib/email/services/workspace-invite";
import { processProjectEmailOutbox } from "../src/lib/email/services/project-notify";

async function main() {
  const connection = getBullConnectionOptions();

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
      // parse-import reserved for large async parse; sync parse used on upload today
      console.log(`[import] skipped job name=${job.name} id=${job.id}`);
    },
    { connection, concurrency: 2 },
  );

  const emailWorker = new Worker<WorkspaceInviteEmailJobData>(
    WORKSPACE_INVITE_EMAIL_QUEUE,
    async (job) => {
      await processInviteEmailOutbox(job.data.outboxId);
    },
    { connection, concurrency: 5 },
  );

  const projectEmailWorker = new Worker<ProjectEmailJobData>(
    PROJECT_EMAIL_QUEUE,
    async (job) => {
      await processProjectEmailOutbox(job.data.outboxId);
    },
    { connection, concurrency: 5 },
  );

  importWorker.on("failed", (job, err) => {
    console.error("[import-worker] failed", job?.id, err.message);
  });
  emailWorker.on("failed", (job, err) => {
    console.error("[email-worker] failed", job?.id, err.message);
  });
  projectEmailWorker.on("failed", (job, err) => {
    console.error("[project-email-worker] failed", job?.id, err.message);
  });

  console.log(
    `[workspace-worker] listening on ${WORKSPACE_IMPORT_QUEUE} + ${WORKSPACE_INVITE_EMAIL_QUEUE} + ${PROJECT_EMAIL_QUEUE}`,
  );

  const shutdown = async () => {
    await Promise.all([importWorker.close(), emailWorker.close(), projectEmailWorker.close()]);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("[workspace-worker] fatal", error);
  process.exit(1);
});
