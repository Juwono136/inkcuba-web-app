import "server-only";

import { createHash, randomBytes } from "crypto";

import { deleteObject, uploadObject } from "@/lib/storage/client";

export const WORKSPACE_IMPORT_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function buildImportFileKey(
  workspaceId: string,
  jobId: string,
): string {
  return `workspaces/${workspaceId}/imports/${jobId}/source.xlsx`;
}

export async function uploadWorkspaceImportFile(input: {
  workspaceId: string;
  jobId: string;
  buffer: Buffer;
  fileName: string;
}): Promise<{ key: string; sha256: string }> {
  const key = buildImportFileKey(input.workspaceId, input.jobId);
  const sha256 = createHash("sha256").update(input.buffer).digest("hex");
  await uploadObject(key, input.buffer, WORKSPACE_IMPORT_MIME);
  return { key, sha256 };
}

export async function deleteWorkspaceImportFile(key: string | null) {
  if (!key) return;
  try {
    await deleteObject(key);
  } catch {
    // best-effort cleanup
  }
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateUnusablePassword(): string {
  return randomBytes(48).toString("base64url");
}
