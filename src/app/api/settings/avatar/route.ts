import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { generateDefaultAvatarUrl } from "@/lib/auth/constants";
import { extractAvatarStorageKey } from "@/lib/media/resolve-avatar-url";
import { rateLimit } from "@/lib/redis";
import { requireApiSession } from "@/lib/settings/require-api-session";
import {
  deleteUserAvatar,
  uploadUserAvatarToStorage,
} from "@/lib/storage/avatar";

async function getStoredUserImage(userId: string): Promise<string | null> {
  const rows = await db
    .select({ image: userTable.image })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return rows[0]?.image ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireApiSession();
    const userId = session.user.id;

    const limit = await rateLimit(`settings-avatar:${userId}`, 10, 60 * 15);

    if (!limit.success) {
      throw new ValidationError(
        "Too many upload attempts. Please try again later.",
      );
    }

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

    // Delete previous object after DB commit so we never orphan the new file
    // if DB write fails, and never leave the old object after a successful replace.
    if (previousKey && previousKey !== result.key) {
      await deleteUserAvatar(previousKey, userId);
    }

    return apiSuccess({ url: result.url, key: result.key, image: result.url });
  } catch (error) {
    return handleApiError(error, "settings-avatar-upload");
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const { session } = await requireApiSession();
    const userId = session.user.id;

    const limit = await rateLimit(
      `settings-avatar-delete:${userId}`,
      10,
      60 * 15,
    );

    if (!limit.success) {
      throw new ValidationError(
        "Too many requests. Please try again later.",
      );
    }

    const previousImage = await getStoredUserImage(userId);
    const previousKey = previousImage
      ? extractAvatarStorageKey(previousImage)
      : null;

    const defaultUrl = generateDefaultAvatarUrl(userId);

    await db
      .update(userTable)
      .set({ image: defaultUrl, updatedAt: new Date() })
      .where(eq(userTable.id, userId));

    if (previousKey) {
      await deleteUserAvatar(previousKey, userId);
    }

    return apiSuccess({ image: defaultUrl });
  } catch (error) {
    return handleApiError(error, "settings-avatar-delete");
  }
}
