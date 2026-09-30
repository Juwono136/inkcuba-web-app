import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { lecturerProfile } from "@/db/schema/profiles";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { createAuditLog } from "@/lib/audit";
import { resolveUserRole } from "@/lib/auth/permissions";
import { getSettingsForUser } from "@/lib/settings/get-settings";

export const lecturerIdentityUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .regex(
      /^[\p{L}\p{M}\s'.-]+$/u,
      "Name may only include letters, spaces, and ' . -",
    ),
  title: z
    .union([
      z
        .string()
        .trim()
        .min(2, "Title must be at least 2 characters")
        .max(80, "Title must be at most 80 characters"),
      z.literal("").transform(() => null),
      z.null(),
    ])
    .optional(),
});

export type LecturerIdentityUpdateInput = z.infer<
  typeof lecturerIdentityUpdateSchema
>;

export async function updateLecturerIdentity(input: {
  userId: string;
  data: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const rows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, input.userId))
    .limit(1);

  const user = rows[0];
  if (!user) throw new NotFoundError("User not found");

  const role = resolveUserRole(user);
  if (role !== "LECTURER") {
    throw new ForbiddenError("Only lecturers can edit name and title here");
  }

  const parsed = lecturerIdentityUpdateSchema.safeParse(input.data);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Invalid identity data",
      parsed.error.flatten(),
    );
  }

  const nextName = parsed.data.name;
  const nextTitle =
    parsed.data.title === undefined
      ? undefined
      : parsed.data.title;

  const profileRows = await db
    .select()
    .from(lecturerProfile)
    .where(eq(lecturerProfile.userId, input.userId))
    .limit(1);

  const previousTitle = profileRows[0]?.title ?? null;

  const nameChanging = nextName !== user.name;
  const titleChanging =
    nextTitle !== undefined && nextTitle !== previousTitle;

  if (!nameChanging && !titleChanging) {
    return getSettingsForUser(input.userId);
  }

  if (nameChanging) {
    await db
      .update(userTable)
      .set({ name: nextName, updatedAt: new Date() })
      .where(eq(userTable.id, input.userId));
  }

  if (titleChanging) {
    if (!profileRows[0]) {
      await db.insert(lecturerProfile).values({
        id: crypto.randomUUID(),
        userId: input.userId,
        title: nextTitle ?? null,
      });
    } else {
      await db
        .update(lecturerProfile)
        .set({ title: nextTitle ?? null, updatedAt: new Date() })
        .where(eq(lecturerProfile.userId, input.userId));
    }
  }

  await createAuditLog({
    actorId: input.userId,
    action: "user.self_update_identity",
    entityType: "user",
    entityId: input.userId,
    metadata: {
      changes: {
        ...(nameChanging
          ? { name: { from: user.name, to: nextName } }
          : {}),
        ...(titleChanging
          ? { title: { from: previousTitle, to: nextTitle ?? null } }
          : {}),
      },
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return getSettingsForUser(input.userId);
}
