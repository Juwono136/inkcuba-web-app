import { type ConnectionOptions } from "bullmq";

export function getBullConnectionFromEnv(): ConnectionOptions {
  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT || "6379");
  if (!host) {
    throw new Error("REDIS_HOST is required for BullMQ");
  }
  return {
    host,
    port,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}

export function getWorkspaceImportSettingsFromEnv() {
  return {
    maxRows: Number(process.env.WORKSPACE_IMPORT_MAX_ROWS || "2000"),
    chunk: Number(process.env.WORKSPACE_IMPORT_CHUNK || "50"),
  };
}
