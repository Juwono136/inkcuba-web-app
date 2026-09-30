import "server-only";

import { createHash } from "crypto";

import sharp from "sharp";

import { ValidationError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { buildStorageKey, deleteObject, uploadObject } from "@/lib/storage/client";
import {
  ALLOWED_AVATAR_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/storage/types";

const ALLOWED_MIME_SET = new Set<string>(ALLOWED_IMAGE_MIME_TYPES);
const ALLOWED_AVATAR_MIME_SET = new Set<string>(ALLOWED_AVATAR_MIME_TYPES);
const REGISTER_AVATAR_PREFIX = "avatars/register/";
const USER_AVATAR_PREFIX = "avatars/users";

export function sanitizeEmailForStorageKey(email: string): string {
  const normalized = email.toLowerCase().trim();

  return createHash("sha256").update(normalized).digest("hex").slice(0, 24);
}

export function isRegisterAvatarKey(key: string): boolean {
  return key.startsWith(REGISTER_AVATAR_PREFIX);
}

export function isUserAvatarKey(key: string, userId?: string): boolean {
  if (!key.startsWith(`${USER_AVATAR_PREFIX}/`)) {
    return false;
  }

  if (!userId) {
    return true;
  }

  return key.startsWith(`${USER_AVATAR_PREFIX}/${userId}/`);
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

  if (mimeType === "image/heic" || mimeType === "image/heif") {
    // ISO BMFF: ftyp box near the start; brand may include heic/heif/mif1/msf1
    const header = buffer.toString("ascii", 0, Math.min(buffer.length, 32));
    return header.includes("ftyp");
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

export type UserAvatarUploadInput = {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  userId: string;
};

async function normalizeAvatarBuffer(input: {
  mimeType: string;
  buffer: Buffer;
}): Promise<{ buffer: Buffer; mimeType: string; fileExtension: string }> {
  const isHeic =
    input.mimeType === "image/heic" || input.mimeType === "image/heif";

  if (!isHeic) {
    const extension =
      input.mimeType === "image/png"
        ? "png"
        : input.mimeType === "image/webp"
          ? "webp"
          : "jpg";

    return {
      buffer: input.buffer,
      mimeType: input.mimeType,
      fileExtension: extension,
    };
  }

  try {
    const converted = await sharp(input.buffer, { failOn: "none" })
      .rotate()
      .toColorspace("srgb")
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    return {
      buffer: converted,
      mimeType: "image/jpeg",
      fileExtension: "jpg",
    };
  } catch (error) {
    logger.error({ err: error }, "HEIC/HEIF conversion failed");
    throw new ValidationError(
      "Unable to process HEIC/HEIF image. Please convert to JPG or PNG and try again.",
    );
  }
}

export function validateUserAvatarUpload(input: UserAvatarUploadInput): void {
  if (!ALLOWED_AVATAR_MIME_SET.has(input.mimeType)) {
    throw new ValidationError(
      "Profile image must be JPG, PNG, WebP, HEIC, or HEIF",
    );
  }

  if (input.size > MAX_AVATAR_SIZE_BYTES) {
    throw new ValidationError("Profile image must be under 5MB");
  }

  if (!validateImageMagicBytes(input.buffer, input.mimeType)) {
    throw new ValidationError("The uploaded file is not a valid image");
  }
}

export async function uploadUserAvatarToStorage(input: UserAvatarUploadInput) {
  let mimeType = input.mimeType;
  const lowerName = input.fileName.toLowerCase();

  if (
    (!mimeType || mimeType === "application/octet-stream") &&
    (lowerName.endsWith(".heic") || lowerName.endsWith(".heif"))
  ) {
    mimeType = "image/heic";
  }

  const normalizedInput = { ...input, mimeType };
  validateUserAvatarUpload(normalizedInput);

  const normalized = await normalizeAvatarBuffer(normalizedInput);
  const safeName = input.fileName.replace(/\.[^.]+$/, "") || "avatar";
  const key = buildStorageKey(
    USER_AVATAR_PREFIX,
    `${safeName}.${normalized.fileExtension}`,
    input.userId,
  );

  try {
    const result = await uploadObject(
      key,
      normalized.buffer,
      normalized.mimeType,
    );

    logger.info(
      { key: result.key, size: result.size, userId: input.userId },
      "User avatar uploaded to storage",
    );

    return result;
  } catch (error) {
    logger.error(
      { err: error, key, userId: input.userId },
      "User avatar upload to storage failed",
    );
    throw new ValidationError(
      "Unable to upload profile image right now. Please try again.",
    );
  }
}

export async function deleteUserAvatar(
  key: string,
  userId: string,
): Promise<void> {
  if (!isUserAvatarKey(key, userId) && !isRegisterAvatarKey(key)) {
    throw new ValidationError("Invalid avatar storage key");
  }

  try {
    await deleteObject(key);
    logger.info({ key, userId }, "User avatar removed from storage");
  } catch (error) {
    logger.warn({ err: error, key, userId }, "Failed to delete user avatar");
    // Non-fatal: DB image URL can still be cleared
  }
}
