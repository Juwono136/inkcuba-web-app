import "server-only";

import sharp from "sharp";

import { ValidationError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { buildStorageKey, deleteObject, uploadObject } from "@/lib/storage/client";
import {
  ALLOWED_WORKSPACE_IMAGE_MIME_TYPES,
  MAX_WORKSPACE_BACKGROUND_SIZE_BYTES,
  MAX_WORKSPACE_DESCRIPTION_IMAGE_SIZE_BYTES,
} from "@/lib/storage/types";

const ALLOWED_MIME_SET = new Set<string>(ALLOWED_WORKSPACE_IMAGE_MIME_TYPES);

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
    const header = buffer.toString("ascii", 0, Math.min(buffer.length, 32));
    return header.includes("ftyp");
  }

  return false;
}

async function normalizeImageBuffer(input: {
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
    logger.error({ err: error }, "Workspace image HEIC conversion failed");
    throw new ValidationError(
      "Unable to process HEIC/HEIF image. Please convert to JPG or PNG and try again.",
    );
  }
}

export function isWorkspaceMediaKey(key: string): boolean {
  return key.startsWith("workspaces/");
}

export function isWorkspaceTmpKeyForLecturer(
  key: string,
  lecturerId: string,
): boolean {
  return key.startsWith(`workspaces/tmp/${lecturerId}/`);
}

export function isWorkspaceOwnedKey(
  key: string,
  workspaceId: string,
  lecturerId: string,
): boolean {
  if (key.startsWith(`workspaces/${workspaceId}/`)) return true;
  return isWorkspaceTmpKeyForLecturer(key, lecturerId);
}

export type WorkspaceImageUploadInput = {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  maxBytes: number;
};

function validateWorkspaceImageUpload(input: WorkspaceImageUploadInput): void {
  if (!ALLOWED_MIME_SET.has(input.mimeType)) {
    throw new ValidationError(
      "Image must be JPG, PNG, WebP, HEIC, or HEIF",
    );
  }

  if (input.size > input.maxBytes) {
    const mb = Math.round(input.maxBytes / (1024 * 1024));
    throw new ValidationError(`Image must be under ${mb}MB`);
  }

  if (!validateImageMagicBytes(input.buffer, input.mimeType)) {
    throw new ValidationError("The uploaded file is not a valid image");
  }
}

async function uploadNormalized(
  folder: string,
  input: WorkspaceImageUploadInput,
  ownerSegment?: string,
) {
  validateWorkspaceImageUpload(input);
  const normalized = await normalizeImageBuffer(input);
  const baseName = input.fileName.replace(/\.[^.]+$/, "") || "image";
  const fileName = `${baseName}.${normalized.fileExtension}`;
  const key = buildStorageKey(folder, fileName, ownerSegment);

  try {
    const result = await uploadObject(
      key,
      normalized.buffer,
      normalized.mimeType,
    );
    logger.info(
      { key: result.key, size: result.size, folder },
      "Workspace image uploaded",
    );
    return result;
  } catch (error) {
    logger.error({ err: error, folder }, "Workspace image upload failed");
    throw new ValidationError(
      "Unable to upload image right now. Please try again.",
    );
  }
}

export async function uploadWorkspaceBackground(input: {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  workspaceId: string;
}) {
  return uploadNormalized(
    `workspaces/${input.workspaceId}/background`,
    {
      ...input,
      maxBytes: MAX_WORKSPACE_BACKGROUND_SIZE_BYTES,
    },
  );
}

export async function uploadWorkspaceDescriptionImage(input: {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  workspaceId: string;
}) {
  return uploadNormalized(
    `workspaces/${input.workspaceId}/description`,
    {
      ...input,
      maxBytes: MAX_WORKSPACE_DESCRIPTION_IMAGE_SIZE_BYTES,
    },
  );
}

export async function uploadWorkspaceTmpDescriptionImage(input: {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  lecturerId: string;
}) {
  return uploadNormalized(
    `workspaces/tmp/${input.lecturerId}`,
    {
      ...input,
      maxBytes: MAX_WORKSPACE_DESCRIPTION_IMAGE_SIZE_BYTES,
    },
  );
}

export async function deleteWorkspaceObject(
  key: string | null | undefined,
): Promise<void> {
  if (!key || !isWorkspaceMediaKey(key)) return;

  try {
    await deleteObject(key);
    logger.info({ key }, "Workspace storage object deleted");
  } catch (error) {
    logger.warn({ err: error, key }, "Failed to delete workspace storage object");
  }
}

export async function deleteWorkspaceObjects(
  keys: string[],
): Promise<void> {
  await Promise.all(keys.map((key) => deleteWorkspaceObject(key)));
}
