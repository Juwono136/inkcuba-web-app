import { Queue, type ConnectionOptions } from "bullmq";

import { getBullConnectionFromEnv } from "@/lib/queues/connection";

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
        attempts: 3,
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

export async function enqueueImportJob(
  name: WorkspaceImportJobName,
  data: WorkspaceImportJobData,
) {
  const queue = getWorkspaceImportQueue();
  return queue.add(name, data, {
    jobId: `${name}:${data.jobId}:${Date.now()}`,
  });
}

export async function enqueueInviteEmail(data: WorkspaceInviteEmailJobData) {
  const queue = getWorkspaceInviteEmailQueue();
  return queue.add("send-invite-email", data, {
    jobId: `email:${data.outboxId}`,
  });
}
