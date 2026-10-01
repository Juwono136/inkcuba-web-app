import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { createAuditLog } from "@/lib/audit";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { generateDefaultAvatarUrl } from "@/lib/auth/constants";
import { extractAvatarStorageKey } from "@/lib/media/resolve-avatar-url";
import { rateLimit } from "@/lib/redis";
import {
  deleteUserAvatar,
  uploadUserAvatarToStorage,
} from "@/lib/storage/avatar";

type RouteContext = { params: Promise<{ userId: string }> };

function clientMeta(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

async function getStoredUserImage(userId: string): Promise<string | null> {
  const rows = await db
    .select({ image: userTable.image })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  return rows[0]?.image ?? null;
}

async function assertTargetUser(userId: string) {
  const rows = await db
    .select({ id: userTable.id, deletedAt: userTable.deletedAt })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new NotFoundError("User not found");
  if (row.deletedAt) {
    throw new ValidationError("Restore the user from trash before editing their photo");
  }
  return row;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireAdminApi();
    const { userId } = await context.params;
    if (!userId?.trim()) throw new ValidationError("User id is required");

    const limit = await rateLimit(
      `admin-user-avatar:${session.user.id}`,
      20,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    await assertTargetUser(userId);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("No profile image provided");
    }

    const previousImage = await getStoredUserImage(userId);
    const previousKey = previousImage
      ? extractAvatarStorageKey(previousImage)
      : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadUserAvatarToStorage({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      buffer,
      userId,
    });

    await db
      .update(userTable)
      .set({ image: result.url, updatedAt: new Date() })
      .where(eq(userTable.id, userId));

    if (previousKey && previousKey !== result.key) {
      await deleteUserAvatar(previousKey, userId);
    }

    const meta = clientMeta(request);
    await createAuditLog({
      actorId: session.user.id,
      action: "user.avatar_update",
      entityType: "user",
      entityId: userId,
      metadata: {
        key: result.key,
        previousKey,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ image: result.url, key: result.key });
  } catch (error) {
    return handleApiError(error, "admin-user-avatar-upload");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireAdminApi();
    const { userId } = await context.params;
    if (!userId?.trim()) throw new ValidationError("User id is required");

    const limit = await rateLimit(
      `admin-user-avatar-delete:${session.user.id}`,
      20,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    await assertTargetUser(userId);

    const previousImage = await getStoredUserImage(userId);
    const previousKey = previousImage
      ? extractAvatarStorageKey(previousImage)
      : null;

    const defaultUrl = generateDefaultAvatarUrl(userId);

    // Idempotent: already on default with no storage key
    if (!previousKey && previousImage === defaultUrl) {
      return apiSuccess({ image: defaultUrl });
    }

    await db
      .update(userTable)
      .set({ image: defaultUrl, updatedAt: new Date() })
      .where(eq(userTable.id, userId));

    if (previousKey) {
      await deleteUserAvatar(previousKey, userId);
    }

    const meta = clientMeta(request);
    await createAuditLog({
      actorId: session.user.id,
      action: "user.avatar_delete",
      entityType: "user",
      entityId: userId,
      metadata: { previousKey },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ image: defaultUrl });
  } catch (error) {
    return handleApiError(error, "admin-user-avatar-delete");
  }
}
