import "server-only";

import { createHash } from "crypto";

import { ValidationError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { buildStorageKey, deleteObject, uploadObject } from "@/lib/storage/client";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/storage/types";

const ALLOWED_MIME_SET = new Set<string>(ALLOWED_IMAGE_MIME_TYPES);
const REGISTER_AVATAR_PREFIX = "avatars/register/";

export function sanitizeEmailForStorageKey(email: string): string {
  const normalized = email.toLowerCase().trim();

  return createHash("sha256").update(normalized).digest("hex").slice(0, 24);
}

export function isRegisterAvatarKey(key: string): boolean {
  return key.startsWith(REGISTER_AVATAR_PREFIX);
}

function validateImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  if (mimeType === "image/webp") {
    return (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  return false;
}

export type AvatarUploadInput = {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  ownerEmail: string;
};

export function validateAvatarUpload(input: AvatarUploadInput): void {
  if (!ALLOWED_MIME_SET.has(input.mimeType)) {
    throw new ValidationError("Profile image must be JPG, PNG, or WebP");
  }

  if (input.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ValidationError("Profile image must be under 2MB");
  }

  if (!validateImageMagicBytes(input.buffer, input.mimeType)) {
    throw new ValidationError("The uploaded file is not a valid image");
  }
}

export async function uploadAvatarToStorage(input: AvatarUploadInput) {
  validateAvatarUpload(input);

  const ownerKey = sanitizeEmailForStorageKey(input.ownerEmail);
  const key = buildStorageKey(
    REGISTER_AVATAR_PREFIX.replace(/\/$/, ""),
    input.fileName,
    ownerKey,
  );

  try {
    const result = await uploadObject(key, input.buffer, input.mimeType);

    logger.info(
      { key: result.key, size: result.size, ownerKey },
      "Registration avatar uploaded to storage",
    );

    return result;
  } catch (error) {
    logger.error({ err: error, key, ownerKey }, "Avatar upload to storage failed");
    throw new ValidationError(
      "Unable to upload profile image right now. Please try again or continue without a photo.",
    );
  }
}

export async function deleteRegisterAvatar(key: string): Promise<void> {
  if (!isRegisterAvatarKey(key)) {
    throw new ValidationError("Invalid avatar storage key");
  }

  try {
    await deleteObject(key);
    logger.info({ key }, "Registration avatar removed from storage");
  } catch (error) {
    logger.warn({ err: error, key }, "Failed to delete registration avatar");
    throw new ValidationError("Unable to remove uploaded profile image");
  }
}
