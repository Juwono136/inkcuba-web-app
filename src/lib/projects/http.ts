import "server-only";

import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";

const IDEMPOTENCY_KEY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readIdempotencyKey(request: NextRequest): string | null {
  const key = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!key) return null;
  if (!IDEMPOTENCY_KEY.test(key)) throw new ValidationError("Invalid idempotency key");
  return key.toLowerCase();
}

export async function readUpload(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    throw new ValidationError("Choose a file to upload");
  }
  const roleValue = String(form.get("role") ?? "ADDITIONAL");
  const role = roleValue === "PROJECT" ? "PROJECT" : "ADDITIONAL";
  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type || "application/octet-stream",
    fileName: file.name || "file",
    role,
  } as const;
}
