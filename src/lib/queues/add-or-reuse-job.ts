import type { Job, JobsOptions, Queue } from "bullmq";

import { isDuplicateBullJobError } from "@/lib/queues/job-id";

type AnyQueue = Queue<any, any, string>;

/**
 * Idempotent Queue.add for a stable custom job id.
 * If a prior job with the same id is completed/failed, it is removed and re-queued
 * (used by email recovery and import commit recovery).
 */
export async function addOrReuseBullJob<DataType>(
  queue: Queue<DataType>,
  name: string,
  data: DataType,
  jobId: string,
  opts?: Omit<JobsOptions, "jobId">,
): Promise<Job<DataType> | null> {
  const q = queue as AnyQueue;
  const add = async () =>
    (await q.add(name, data, { ...opts, jobId })) as Job<DataType>;

  try {
    return await add();
  } catch (error) {
    if (!isDuplicateBullJobError(error)) throw error;
    const existing = await q.getJob(jobId);
    if (!existing) return null;
    const state = await existing.getState();
    if (state === "completed" || state === "failed") {
      await existing.remove();
      return add();
    }
    return existing as Job<DataType>;
  }
}
