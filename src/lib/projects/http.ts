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

function mimeFromFileName(fileName: string, fallback: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    tif: "image/tiff",
    tiff: "image/tiff",
    svg: "image/svg+xml",
    eps: "application/postscript",
    psd: "image/vnd.adobe.photoshop",
    cdr: "application/octet-stream",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
  };
  return map[ext] || fallback;
}

export async function readUpload(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    throw new ValidationError("Choose a file to upload");
  }
  const roleValue = String(form.get("role") ?? "ADDITIONAL");
  const role = roleValue === "PROJECT" ? "PROJECT" : "ADDITIONAL";
  const fileName = file.name || "file";
  const reported = file.type || "application/octet-stream";
  const mimeType =
    !reported || reported === "application/octet-stream"
      ? mimeFromFileName(fileName, reported)
      : reported;
  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType,
    fileName,
    role,
  } as const;
}
