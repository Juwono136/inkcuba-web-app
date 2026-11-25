import type { ConnectionOptions, Queue } from "bullmq";

import { getBullConnectionFromEnv } from "@/lib/queues/connection";

export const PROJECT_EMAIL_QUEUE = "project-email";

export type ProjectEmailJobData = {
  outboxId: string;
};

function getBullConnection(): ConnectionOptions {
  return getBullConnectionFromEnv();
}

type QueueGlobal = typeof globalThis & {
  __inkcubaProjectEmailQueue?: Queue<ProjectEmailJobData>;
};

const globalStore = globalThis as QueueGlobal;

/**
 * Lazy-load BullMQ so optional peer deps (e.g. `@valkey/valkey-glide`) are not
 * resolved by the Next.js bundler on every student/lecturer API that only
 * transitively imports email helpers.
 */
export async function getProjectEmailQueue() {
  if (!globalStore.__inkcubaProjectEmailQueue) {
    const { Queue: BullQueue } = await import("bullmq");
    globalStore.__inkcubaProjectEmailQueue = new BullQueue<ProjectEmailJobData>(
      PROJECT_EMAIL_QUEUE,
      {
        connection: getBullConnection(),
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 500,
          attempts: 5,
          backoff: { type: "exponential", delay: 3000 },
        },
      },
    );
  }
  return globalStore.__inkcubaProjectEmailQueue;
}

export async function enqueueProjectEmail(data: ProjectEmailJobData) {
  const queue = await getProjectEmailQueue();
  return queue.add("send-project-email", data, {
    jobId: `project-email:${data.outboxId}`,
  });
}
