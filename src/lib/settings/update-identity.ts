import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import {
  lecturerProfile,
  studentProfile,
} from "@/db/schema/profiles";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/api/errors";
import { createAuditLog } from "@/lib/audit";
import { resolveUserRole } from "@/lib/auth/permissions";
import { assertDirectoryValue } from "@/lib/directory/service";
import { getEditableFieldsForRole } from "@/lib/role-field-permissions/service";
import type { SettingsIdentityField } from "@/lib/role-field-permissions/types";
import { getSettingsForUser } from "@/lib/settings/get-settings";
import { personNameSchema } from "@/lib/validators/common";

const clearableText = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const nameSchema = personNameSchema;

const titleSchema = z
  .union([
    z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(80, "Title must be at most 80 characters"),
    z.literal("").transform(() => null),
    z.null(),
  ])
  .optional();

const idSchema = z
  .union([
    z
      .string()
      .trim()
      .min(5, "ID must be at least 5 characters")
      .max(32, "ID must be at most 32 characters")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "ID may only include letters, numbers, _ and -",
      ),
    z.literal("").transform(() => null),
    z.null(),
  ])
  .optional();

export const selfIdentityUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    title: titleSchema,
    campus: clearableText.optional(),
    nim: idSchema,
    nidn: idSchema,
    major: clearableText.optional(),
    batch: clearableText.optional(),
    semester: clearableText.optional(),
    department: clearableText.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.title !== undefined ||
      value.campus !== undefined ||
      value.nim !== undefined ||
      value.nidn !== undefined ||
      value.major !== undefined ||
      value.batch !== undefined ||
      value.semester !== undefined ||
      value.department !== undefined,
    { message: "Provide at least one field to update" },
  );

/** @deprecated Use selfIdentityUpdateSchema */
export const lecturerIdentityUpdateSchema = selfIdentityUpdateSchema;

export type SelfIdentityUpdateInput = z.infer<typeof selfIdentityUpdateSchema>;
export type LecturerIdentityUpdateInput = SelfIdentityUpdateInput;

function emptyOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Self-service identity update for My Settings.
 * Only fields marked editable for the user's role in `role_field_permission` are applied.
 */
export async function updateSelfIdentity(input: {
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
  const editable = await getEditableFieldsForRole(role);
  if (editable.length === 0) {
    throw new ForbiddenError(
      "Your role cannot edit identity fields from My Settings",
    );
  }

  const parsed = selfIdentityUpdateSchema.safeParse(input.data);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Invalid identity data",
      parsed.error.flatten(),
    );
  }

  const requested = parsed.data;
  const denied: string[] = [];
  const fieldMap: Record<string, SettingsIdentityField> = {
    name: "name",
    title: "title",
    campus: "campus",
    nim: "nim",
    nidn: "nidn",
    major: "major",
    batch: "batch",
    semester: "semester",
    department: "department",
  };

  for (const [key, field] of Object.entries(fieldMap)) {
    if (
      requested[key as keyof typeof requested] !== undefined &&
      !editable.includes(field)
    ) {
      denied.push(field);
    }
  }
  if (denied.length > 0) {
    throw new ForbiddenError(
      `You are not allowed to edit: ${denied.join(", ")}`,
    );
  }

  let nextName = user.name;
  if (requested.name !== undefined && editable.includes("name")) {
    nextName = requested.name;
  }

  let nextCampus = emptyOrNull(user.campus);
  if (requested.campus !== undefined && editable.includes("campus")) {
    nextCampus = await assertDirectoryValue(
      "campus",
      requested.campus,
      "Campus",
    );
  }

  let nextNim = emptyOrNull(user.nim);
  if (requested.nim !== undefined && editable.includes("nim")) {
    nextNim = requested.nim;
  }

  let nextNidn = emptyOrNull(user.nidn);
  if (requested.nidn !== undefined && editable.includes("nidn")) {
    nextNidn = requested.nidn;
  }

  const profileIsStudent = role === "STUDENT";
  const profileIsLecturerLike = role === "LECTURER" || role === "ADMIN";

  let previousTitle: string | null = null;
  let previousMajor: string | null = null;
  let previousBatch: string | null = null;
  let previousSemester: string | null = null;
  let previousDepartment: string | null = null;

  if (profileIsStudent) {
    const profileRows = await db
      .select()
      .from(studentProfile)
      .where(eq(studentProfile.userId, input.userId))
      .limit(1);
    const profile = profileRows[0];
    previousTitle = profile?.title ?? null;
    previousMajor = profile?.major ?? null;
    previousBatch = profile?.batch ?? null;
    previousSemester = profile?.semester ?? null;
    previousDepartment = profile?.department ?? null;
  } else if (profileIsLecturerLike) {
    const profileRows = await db
      .select()
      .from(lecturerProfile)
      .where(eq(lecturerProfile.userId, input.userId))
      .limit(1);
    const profile = profileRows[0];
    previousTitle = profile?.title ?? null;
    previousMajor = profile?.major ?? null;
    previousDepartment = profile?.department ?? null;
  }

  let nextTitle = previousTitle;
  if (requested.title !== undefined && editable.includes("title")) {
    nextTitle = requested.title ?? null;
  }

  let nextMajor = previousMajor;
  if (requested.major !== undefined && editable.includes("major")) {
    nextMajor = await assertDirectoryValue("major", requested.major, "Major");
  }

  let nextBatch = previousBatch;
  if (
    profileIsStudent &&
    requested.batch !== undefined &&
    editable.includes("batch")
  ) {
    nextBatch = await assertDirectoryValue("batch", requested.batch, "Batch");
  }

  let nextSemester = previousSemester;
  if (
    profileIsStudent &&
    requested.semester !== undefined &&
    editable.includes("semester")
  ) {
    nextSemester = await assertDirectoryValue(
      "semester",
      requested.semester,
      "Semester",
    );
  }

  let nextDepartment = previousDepartment;
  if (requested.department !== undefined && editable.includes("department")) {
    nextDepartment = await assertDirectoryValue(
      "department",
      requested.department,
      "Department",
    );
  }

  const nameChanging = nextName !== user.name;
  const campusChanging = nextCampus !== emptyOrNull(user.campus);
  const nimChanging = nextNim !== emptyOrNull(user.nim);
  const nidnChanging = nextNidn !== emptyOrNull(user.nidn);
  const titleChanging = nextTitle !== previousTitle;
  const majorChanging = nextMajor !== previousMajor;
  const batchChanging = nextBatch !== previousBatch;
  const semesterChanging = nextSemester !== previousSemester;
  const departmentChanging = nextDepartment !== previousDepartment;

  if (
    !nameChanging &&
    !campusChanging &&
    !nimChanging &&
    !nidnChanging &&
    !titleChanging &&
    !majorChanging &&
    !batchChanging &&
    !semesterChanging &&
    !departmentChanging
  ) {
    return getSettingsForUser(input.userId);
  }

  if (nameChanging || campusChanging || nimChanging || nidnChanging) {
    await db
      .update(userTable)
      .set({
        ...(nameChanging ? { name: nextName } : {}),
        ...(campusChanging ? { campus: nextCampus } : {}),
        ...(nimChanging ? { nim: nextNim } : {}),
        ...(nidnChanging ? { nidn: nextNidn } : {}),
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, input.userId));
  }

  if (profileIsStudent) {
    if (
      titleChanging ||
      majorChanging ||
      batchChanging ||
      semesterChanging ||
      departmentChanging
    ) {
      const existing = await db
        .select({ id: studentProfile.id })
        .from(studentProfile)
        .where(eq(studentProfile.userId, input.userId))
        .limit(1);
      if (!existing[0]) {
        await db.insert(studentProfile).values({
          id: crypto.randomUUID(),
          userId: input.userId,
          isAlumni: false,
          title: nextTitle,
          major: nextMajor,
          batch: nextBatch,
          semester: nextSemester,
          department: nextDepartment,
        });
      } else {
        await db
          .update(studentProfile)
          .set({
            ...(titleChanging ? { title: nextTitle } : {}),
            ...(majorChanging ? { major: nextMajor } : {}),
            ...(batchChanging ? { batch: nextBatch } : {}),
            ...(semesterChanging ? { semester: nextSemester } : {}),
            ...(departmentChanging ? { department: nextDepartment } : {}),
            updatedAt: new Date(),
          })
          .where(eq(studentProfile.userId, input.userId));
      }
    }
  } else if (profileIsLecturerLike) {
    if (titleChanging || majorChanging || departmentChanging) {
      const existing = await db
        .select({ id: lecturerProfile.id })
        .from(lecturerProfile)
        .where(eq(lecturerProfile.userId, input.userId))
        .limit(1);
      if (!existing[0]) {
        await db.insert(lecturerProfile).values({
          id: crypto.randomUUID(),
          userId: input.userId,
          title: nextTitle,
          major: nextMajor,
          department: nextDepartment,
        });
      } else {
        await db
          .update(lecturerProfile)
          .set({
            ...(titleChanging ? { title: nextTitle } : {}),
            ...(majorChanging ? { major: nextMajor } : {}),
            ...(departmentChanging ? { department: nextDepartment } : {}),
            updatedAt: new Date(),
          })
          .where(eq(lecturerProfile.userId, input.userId));
      }
    }
  }

  await createAuditLog({
    actorId: input.userId,
    action: "user.self_update_identity",
    entityType: "user",
    entityId: input.userId,
    metadata: {
      role,
      changes: {
        ...(nameChanging ? { name: { from: user.name, to: nextName } } : {}),
        ...(campusChanging
          ? { campus: { from: emptyOrNull(user.campus), to: nextCampus } }
          : {}),
        ...(nimChanging
          ? { nim: { from: emptyOrNull(user.nim), to: nextNim } }
          : {}),
        ...(nidnChanging
          ? { nidn: { from: emptyOrNull(user.nidn), to: nextNidn } }
          : {}),
        ...(titleChanging
          ? { title: { from: previousTitle, to: nextTitle } }
          : {}),
        ...(majorChanging
          ? { major: { from: previousMajor, to: nextMajor } }
          : {}),
        ...(batchChanging
          ? { batch: { from: previousBatch, to: nextBatch } }
          : {}),
        ...(semesterChanging
          ? { semester: { from: previousSemester, to: nextSemester } }
          : {}),
        ...(departmentChanging
          ? { department: { from: previousDepartment, to: nextDepartment } }
          : {}),
      },
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return getSettingsForUser(input.userId);
}

/** @deprecated Use updateSelfIdentity */
export const updateLecturerIdentity = updateSelfIdentity;
