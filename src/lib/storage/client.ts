import "server-only";

import { getStorageEnv } from "@/config/storage-env";
import { logger } from "@/lib/logger";
import type { StorageHealthResult, UploadResult } from "@/lib/storage/types";

function getAuthHeader(): string {
  const env = getStorageEnv();
  const credentials = Buffer.from(
    `${env.USERNAME_STORAGE}:${env.PASSWORD_STORAGE}`,
  ).toString("base64");
  return `Basic ${credentials}`;
}

function buildObjectUrl(key: string): string {
  const env = getStorageEnv();
  const base = env.STORAGE_ENDPOINT.replace(/\/$/, "");
  const bucket = env.STORAGE_BUCKET.replace(/^\//, "");
  const normalizedKey = key.replace(/^\//, "");
  return `${base}/${bucket}/${normalizedKey}`;
}

export function sanitizeFileName(fileName: string): string {
  const baseName = fileName.split(/[/\\]/).pop() ?? "file";
  return baseName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .toLowerCase();
}

export function buildStorageKey(
  folder: string,
  fileName: string,
  userId?: string,
): string {
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "");
  const safeName = sanitizeFileName(fileName);
  const prefix = userId ? `${userId}/` : "";
  const timestamp = Date.now();
  return `${safeFolder}/${prefix}${timestamp}-${safeName}`;
}

export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array,
  mimeType: string,
): Promise<UploadResult> {
  const url = buildObjectUrl(key);

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": mimeType,
      "Content-Length": String(body.byteLength),
    },
    body: Buffer.from(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown storage error");
    logger.error({ key, status: response.status, errorText }, "Storage upload failed");
    throw new Error(`Storage upload failed: ${response.status}`);
  }

  return {
    key,
    url,
    size: body.byteLength,
    mimeType,
  };
}

export async function deleteObject(key: string): Promise<void> {
  const url = buildObjectUrl(key);
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Storage delete failed: ${response.status}`);
  }
}

export async function checkStorageHealth(): Promise<StorageHealthResult> {
  const bucket = getStorageEnv().STORAGE_BUCKET;

  try {
    const probeKey = `.healthcheck-${Date.now()}`;
    const probeBody = Buffer.from("ok");

    await uploadObject(probeKey, probeBody, "text/plain");
    await deleteObject(probeKey);

    return { ok: true, bucket };
  } catch (error) {
    return {
      ok: false,
      bucket,
      error:
        error instanceof Error
          ? error.message
          : "Storage health check failed",
    };
  }
}

export async function ensureStorageBucket(): Promise<void> {
  const bucketUrl = buildObjectUrl("");

  try {
    const response = await fetch(bucketUrl, {
      method: "HEAD",
      headers: { Authorization: getAuthHeader() },
    });

    if (response.ok || response.status === 404) {
      logger.info({ bucket: getStorageEnv().STORAGE_BUCKET }, "Storage bucket ready");
      return;
    }

    logger.warn(
      { status: response.status, bucket: getStorageEnv().STORAGE_BUCKET },
      "Storage bucket probe returned unexpected status",
    );
  } catch (error) {
    logger.warn(
      { err: error, bucket: getStorageEnv().STORAGE_BUCKET },
      "Storage bucket probe failed — uploads may fail until storage is available",
    );
  }
}
