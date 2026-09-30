export type StorageAuthMode = "nginx-basic" | "s3";

export type UploadResult = {
  key: string;
  url: string;
  size: number;
  mimeType: string;
};

export type StorageHealthResult = {
  ok: boolean;
  bucket: string;
  error?: string;
};

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_POSTER_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024;

export const ALLOWED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;
