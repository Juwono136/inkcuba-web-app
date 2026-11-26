/**
 * Build a BullMQ custom job id.
 * BullMQ rejects ids that contain `:` (used internally as a Redis key separator).
 */
export function bullJobId(...parts: Array<string | number | null | undefined>): string {
  const id = parts
    .filter((part) => part != null && String(part).length > 0)
    .map((part) => String(part).replace(/:/g, "-"))
    .join("-");
  if (!id) {
    throw new Error("BullMQ job id must not be empty");
  }
  if (id.includes(":")) {
    throw new Error("BullMQ job id must not contain ':'");
  }
  return id;
}

/** True when Queue.add rejected because the custom job id already exists. */
export function isDuplicateBullJobError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /already exists|JobId.*exist|duplicat/i.test(message);
}
