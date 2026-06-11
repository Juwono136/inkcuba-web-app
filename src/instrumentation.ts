export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureStorageBucket } = await import("@/lib/storage");
    const { logger } = await import("@/lib/logger");

    try {
      await ensureStorageBucket();
    } catch (error) {
      logger.warn({ err: error }, "Storage bucket initialization skipped");
    }
  }
}
