import { Queue, type ConnectionOptions } from "bullmq";

import { addOrReuseBullJob } from "@/lib/queues/add-or-reuse-job";
import { getBullConnectionFromEnv } from "@/lib/queues/connection";
import { bullJobId } from "@/lib/queues/job-id";

export const WORKSPACE_IMPORT_QUEUE = "workspace-import";
export const WORKSPACE_INVITE_EMAIL_QUEUE = "workspace-invite-email";

export type WorkspaceImportJobName = "parse-import" | "commit-import";

export type WorkspaceImportJobData = {
  jobId: string;
  workspaceId: string;
  lecturerId: string;
};

export type WorkspaceInviteEmailJobData = {
  outboxId: string;
};

function getBullConnection(): ConnectionOptions {
  return getBullConnectionFromEnv();
}

type QueueGlobal = typeof globalThis & {
  __inkcubaImportQueue?: Queue<
    WorkspaceImportJobData,
    void,
    WorkspaceImportJobName
  >;
  __inkcubaInviteEmailQueue?: Queue<WorkspaceInviteEmailJobData>;
};

const globalStore = globalThis as QueueGlobal;

export function getWorkspaceImportQueue() {
  if (!globalStore.__inkcubaImportQueue) {
    globalStore.__inkcubaImportQueue = new Queue<
      WorkspaceImportJobData,
      void,
      WorkspaceImportJobName
    >(WORKSPACE_IMPORT_QUEUE, {
      connection: getBullConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
      },
    });
  }
  return globalStore.__inkcubaImportQueue;
}

export function getWorkspaceInviteEmailQueue() {
  if (!globalStore.__inkcubaInviteEmailQueue) {
    globalStore.__inkcubaInviteEmailQueue =
      new Queue<WorkspaceInviteEmailJobData>(WORKSPACE_INVITE_EMAIL_QUEUE, {
        connection: getBullConnection(),
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 500,
          attempts: 5,
          backoff: { type: "exponential", delay: 3000 },
        },
      });
  }
  return globalStore.__inkcubaInviteEmailQueue;
}

export function getBullConnectionOptions(): ConnectionOptions {
  return getBullConnection();
}

/**
 * One active BullMQ job per import commit. Stable id prevents two workers from
 * processing the same Excel commit chunks in parallel (duplicate members/emails).
 * Continuation after a chunk removes the completed job and re-queues the same id.
 */
export async function enqueueImportJob(
  name: WorkspaceImportJobName,
  data: WorkspaceImportJobData,
) {
  const queue = getWorkspaceImportQueue();
  return addOrReuseBullJob(
    queue,
    name,
    data,
    bullJobId(name, data.jobId),
  );
}

export async function enqueueInviteEmail(data: WorkspaceInviteEmailJobData) {
  const queue = getWorkspaceInviteEmailQueue();
  return addOrReuseBullJob(
    queue,
    "send-invite-email",
    data,
    bullJobId("invite-email", data.outboxId),
  );
}
