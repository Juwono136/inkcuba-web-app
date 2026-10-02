import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { randomBytes } from "crypto";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { directoryOption } from "@/db/schema/directory";
import { lecturerProfile } from "@/db/schema/profiles";
import { workspace } from "@/db/schema/workspaces";
import { createAuditLog } from "@/lib/audit";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/api/errors";
import { assertDirectoryValue, resolveDirectoryLabels } from "@/lib/directory/service";
import { logger } from "@/lib/logger";
import {
  assertWorkspaceDescriptionLength,
  extractDescriptionImageKeys,
  sanitizeWorkspaceDescriptionHtml,
  toMediaProxyUrl,
} from "@/lib/workspaces/sanitize-description";
import {
  deleteWorkspaceObject,
  deleteWorkspaceObjects,
  isWorkspaceOwnedKey,
  isWorkspaceTmpKeyForLecturer,
  uploadWorkspaceBackground,
  uploadWorkspaceDescriptionImage,
  uploadWorkspaceTmpDescriptionImage,
} from "@/lib/workspaces/storage";
import type {
  WorkspaceCreateInput,
  WorkspaceListQueryInput,
  WorkspaceUpdateInput,
} from "@/lib/workspaces/validators";
import type {
  WorkspaceDetail,
  WorkspaceLecturerInfo,
  WorkspaceListPage,
  WorkspaceRecord,
  WorkspaceStatus,
} from "@/lib/workspaces/types";
import {
  isWorkspaceOpenToStudents,
  WORKSPACE_LIST_DEFAULT_PAGE_SIZE,
  WORKSPACE_STATUS_LABELS,
} from "@/lib/workspaces/types";

function generateInviteCode(): string {
  return randomBytes(8).toString("base64url").slice(0, 12);
}

function emptyOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapWorkspaceRow(
  row: typeof workspace.$inferSelect,
  semesterLabel: string,
): WorkspaceRecord {
  return {
    id: row.id,
    lecturerId: row.lecturerId,
    name: row.name,
    className: row.className,
    semester: row.semester,
    semesterLabel,
    description: row.description,
    backgroundImageKey: row.backgroundImageKey,
    backgroundImageUrl: row.backgroundImageKey
      ? toMediaProxyUrl(row.backgroundImageKey)
      : null,
    inviteCode: row.inviteCode,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolveSemesterLabel(value: string): Promise<string> {
  const labels = await resolveDirectoryLabels([
    { category: "semester", value },
  ]);
  return labels.semester ?? value;
}

async function resolveSemesterLabelsBatch(
  values: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(values.filter((v) => v.trim() !== ""))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const rows = await db
    .select({
      value: directoryOption.value,
      label: directoryOption.label,
    })
    .from(directoryOption)
    .where(
      and(
        eq(directoryOption.category, "semester"),
        inArray(directoryOption.value, unique),
      ),
    );

  for (const row of rows) {
    map.set(row.value, row.label);
  }
  for (const value of unique) {
    if (!map.has(value)) map.set(value, value);
  }
  return map;
}

function validateDescriptionImageOwnership(input: {
  html: string | null;
  lecturerId: string;
  workspaceId?: string;
}): void {
  const keys = extractDescriptionImageKeys(input.html);
  for (const key of keys) {
    const owned = input.workspaceId
      ? isWorkspaceOwnedKey(key, input.workspaceId, input.lecturerId)
      : isWorkspaceTmpKeyForLecturer(key, input.lecturerId);
    if (!owned) {
      throw new ValidationError(
        "Description contains an image that is not allowed for this workspace",
      );
    }
  }
}

async function prepareDescription(
  raw: string | null | undefined,
  lecturerId: string,
  workspaceId?: string,
): Promise<string | null | undefined> {
  if (raw === undefined) return undefined;

  let description: string | null;
  try {
    description = sanitizeWorkspaceDescriptionHtml(raw);
    assertWorkspaceDescriptionLength(description);
  } catch (error) {
    throw new ValidationError(
      error instanceof Error ? error.message : "Invalid description content",
    );
  }

  validateDescriptionImageOwnership({
    html: description,
    lecturerId,
    workspaceId,
  });

  return description;
}

async function loadOwnedWorkspace(
  workspaceId: string,
  lecturerId: string,
): Promise<typeof workspace.$inferSelect> {
  const rows = await db
    .select()
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);

  const row = rows[0];
  if (!row) throw new NotFoundError("Workspace not found");
  if (row.lecturerId !== lecturerId) {
    throw new ForbiddenError("You do not own this workspace");
  }
  return row;
}

/**
 * Server-side gate for any student-facing workspace action (join, list
 * membership content, submit, etc.). Draft and Inactive are never open.
 */
export async function assertStudentCanAccessWorkspace(
  workspaceId: string,
): Promise<typeof workspace.$inferSelect> {
  const rows = await db
    .select()
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);

  const row = rows[0];
  if (!row) throw new NotFoundError("Workspace not found");

  if (!isWorkspaceOpenToStudents(row.status)) {
    const label = WORKSPACE_STATUS_LABELS[row.status];
    throw new ForbiddenError(
      row.status === "DRAFT"
        ? "This workspace is still a draft and is not open to students yet."
        : `This workspace is ${label.toLowerCase()} and cannot be accessed by students.`,
    );
  }

  return row;
}

export async function assertStudentCanAccessWorkspaceByInviteCode(
  inviteCode: string,
): Promise<typeof workspace.$inferSelect> {
  const code = inviteCode.trim();
  if (!code) throw new ValidationError("Invite code is required");

  const rows = await db
    .select()
    .from(workspace)
    .where(eq(workspace.inviteCode, code))
    .limit(1);

  const row = rows[0];
  if (!row) throw new NotFoundError("Invalid invite code");

  if (!isWorkspaceOpenToStudents(row.status)) {
    throw new ForbiddenError(
      row.status === "DRAFT"
        ? "This workspace is still a draft and is not open to students yet."
        : "This workspace is inactive and cannot be accessed by students.",
    );
  }

  return row;
}

async function loadLecturerInfo(
  lecturerId: string,
): Promise<WorkspaceLecturerInfo> {
  const rows = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, lecturerId))
    .limit(1);

  const user = rows[0];
  if (!user) throw new NotFoundError("Lecturer not found");

  const profiles = await db
    .select()
    .from(lecturerProfile)
    .where(eq(lecturerProfile.userId, lecturerId))
    .limit(1);

  const profile = profiles[0];
  const campus = emptyOrNull(user.campus);
  const major = emptyOrNull(profile?.major);
  const department = emptyOrNull(profile?.department);

  const labels = await resolveDirectoryLabels([
    { category: "campus", value: campus },
    { category: "major", value: major },
    { category: "department", value: department },
  ]);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    campus,
    campusLabel: labels.campus,
    major,
    majorLabel: labels.major,
    department,
    departmentLabel: labels.department,
    title: emptyOrNull(profile?.title),
    nidn: emptyOrNull(user.nidn),
    binusianId: emptyOrNull(user.nim) ?? emptyOrNull(user.nidn),
  };
}

export async function listLecturerWorkspaces(input: {
  lecturerId: string;
  query?: Partial<WorkspaceListQueryInput>;
  /** @deprecated Prefer query.pageSize — kept for overview preview. */
  limit?: number;
}): Promise<WorkspaceListPage> {
  const page = Math.max(1, input.query?.page ?? 1);
  const pageSize = Math.min(
    Math.max(
      input.query?.pageSize ??
        input.limit ??
        WORKSPACE_LIST_DEFAULT_PAGE_SIZE,
      1,
    ),
    100,
  );
  const q = (input.query?.q ?? "").trim();
  const semester = (input.query?.semester ?? "").trim();
  const status = input.query?.status ?? "ALL";
  const sortBy = input.query?.sortBy ?? "updatedAt";
  const sortDir = input.query?.sortDir ?? "desc";

  const conditions: SQL[] = [eq(workspace.lecturerId, input.lecturerId)];

  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(workspace.name, pattern),
        ilike(workspace.className, pattern),
        ilike(workspace.semester, pattern),
      )!,
    );
  }

  if (semester) {
    conditions.push(eq(workspace.semester, semester));
  }

  if (status !== "ALL") {
    conditions.push(eq(workspace.status, status));
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db
    .select({ total: count() })
    .from(workspace)
    .where(whereClause);

  const total = totalRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const sortColumn = {
    updatedAt: workspace.updatedAt,
    createdAt: workspace.createdAt,
    name: workspace.name,
    className: workspace.className,
    semester: workspace.semester,
  }[sortBy];

  const orderExpr =
    sortDir === "asc" ? asc(sortColumn) : desc(sortColumn);

  const rows = await db
    .select()
    .from(workspace)
    .where(whereClause)
    .orderBy(orderExpr, desc(workspace.id))
    .limit(pageSize)
    .offset(offset);

  const semesterLabels = await resolveSemesterLabelsBatch(
    rows.map((row) => row.semester),
  );

  const items: WorkspaceRecord[] = rows.map((row) =>
    mapWorkspaceRow(row, semesterLabels.get(row.semester) ?? row.semester),
  );

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function getLecturerWorkspaceDetail(input: {
  workspaceId: string;
  lecturerId: string;
}): Promise<WorkspaceDetail> {
  const row = await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const semesterLabel = await resolveSemesterLabel(row.semester);
  const lecturer = await loadLecturerInfo(input.lecturerId);

  return {
    ...mapWorkspaceRow(row, semesterLabel),
    lecturer,
  };
}

export async function createLecturerWorkspace(input: {
  lecturerId: string;
  data: WorkspaceCreateInput;
  backgroundFile?: {
    fileName: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
  } | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<WorkspaceDetail> {
  const semester = await assertDirectoryValue(
    "semester",
    input.data.semester,
    "Semester",
  );
  if (!semester) {
    throw new ValidationError("Semester is required");
  }

  const description =
    (await prepareDescription(input.data.description, input.lecturerId)) ??
    null;

  const id = crypto.randomUUID();
  let inviteCode = generateInviteCode();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const [created] = await db
        .insert(workspace)
        .values({
          id,
          lecturerId: input.lecturerId,
          name: input.data.name,
          className: input.data.className,
          semester,
          description,
          inviteCode,
          status: input.data.status ?? "DRAFT",
        })
        .returning();

      if (!created) {
        throw new ValidationError("Unable to create workspace");
      }

      let backgroundImageKey: string | null = null;
      let backgroundImageUrl: string | null = null;

      if (input.backgroundFile) {
        const uploaded = await uploadWorkspaceBackground({
          ...input.backgroundFile,
          workspaceId: id,
        });
        backgroundImageKey = uploaded.key;
        backgroundImageUrl = uploaded.url;

        await db
          .update(workspace)
          .set({
            backgroundImageKey,
            backgroundImageUrl,
          })
          .where(eq(workspace.id, id));
      }

      await createAuditLog({
        actorId: input.lecturerId,
        action: "workspace.create",
        entityType: "workspace",
        entityId: id,
        metadata: {
          name: input.data.name,
          className: input.data.className,
          semester,
          status: input.data.status ?? "DRAFT",
        },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });

      return getLecturerWorkspaceDetail({
        workspaceId: id,
        lecturerId: input.lecturerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("workspace_invite_code") ||
        message.includes("invite_code")
      ) {
        inviteCode = generateInviteCode();
        continue;
      }
      if (
        message.includes("workspace_unique_class_idx") ||
        message.includes("unique")
      ) {
        throw new ConflictError(
          "A workspace with the same name, class, and semester already exists",
        );
      }
      throw error;
    }
  }

  throw new ValidationError("Unable to create workspace. Please try again.");
}

export async function updateLecturerWorkspace(input: {
  workspaceId: string;
  lecturerId: string;
  data: WorkspaceUpdateInput;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<WorkspaceDetail> {
  const current = await loadOwnedWorkspace(input.workspaceId, input.lecturerId);

  const nextName = input.data.name ?? current.name;
  const nextClassName = input.data.className ?? current.className;
  let nextSemester = current.semester;

  if (input.data.semester !== undefined) {
    const semester = await assertDirectoryValue(
      "semester",
      input.data.semester,
      "Semester",
    );
    if (!semester) throw new ValidationError("Semester is required");
    nextSemester = semester;
  }

  let nextDescription = current.description;
  if (input.data.description !== undefined) {
    nextDescription =
      (await prepareDescription(
        input.data.description,
        input.lecturerId,
        input.workspaceId,
      )) ?? null;
  }

  const nextStatus: WorkspaceStatus =
    input.data.status !== undefined ? input.data.status : current.status;

  const unchanged =
    nextName === current.name &&
    nextClassName === current.className &&
    nextSemester === current.semester &&
    nextDescription === current.description &&
    nextStatus === current.status;

  if (unchanged) {
    return getLecturerWorkspaceDetail({
      workspaceId: input.workspaceId,
      lecturerId: input.lecturerId,
    });
  }

  const previousImageKeys = extractDescriptionImageKeys(current.description);
  const nextImageKeys = extractDescriptionImageKeys(nextDescription);
  const orphanKeys = previousImageKeys.filter(
    (key) => !nextImageKeys.includes(key),
  );

  try {
    await db
      .update(workspace)
      .set({
        name: nextName,
        className: nextClassName,
        semester: nextSemester,
        description: nextDescription,
        status: nextStatus,
      })
      .where(
        and(
          eq(workspace.id, input.workspaceId),
          eq(workspace.lecturerId, input.lecturerId),
        ),
      );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("workspace_unique_class_idx") ||
      message.includes("unique")
    ) {
      throw new ConflictError(
        "A workspace with the same name, class, and semester already exists",
      );
    }
    throw error;
  }

  if (orphanKeys.length > 0) {
    await deleteWorkspaceObjects(orphanKeys);
  }

  await createAuditLog({
    actorId: input.lecturerId,
    action: "workspace.update",
    entityType: "workspace",
    entityId: input.workspaceId,
    metadata: {
      changes: {
        ...(nextName !== current.name
          ? { name: { from: current.name, to: nextName } }
          : {}),
        ...(nextClassName !== current.className
          ? { className: { from: current.className, to: nextClassName } }
          : {}),
        ...(nextSemester !== current.semester
          ? { semester: { from: current.semester, to: nextSemester } }
          : {}),
        ...(nextDescription !== current.description
          ? { description: true }
          : {}),
        ...(nextStatus !== current.status
          ? { status: { from: current.status, to: nextStatus } }
          : {}),
      },
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return getLecturerWorkspaceDetail({
    workspaceId: input.workspaceId,
    lecturerId: input.lecturerId,
  });
}

export async function deleteLecturerWorkspace(input: {
  workspaceId: string;
  lecturerId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const current = await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const descriptionKeys = extractDescriptionImageKeys(current.description);
  const backgroundKey = current.backgroundImageKey;

  await db
    .delete(workspace)
    .where(
      and(
        eq(workspace.id, input.workspaceId),
        eq(workspace.lecturerId, input.lecturerId),
      ),
    );

  await deleteWorkspaceObjects([
    ...descriptionKeys,
    ...(backgroundKey ? [backgroundKey] : []),
  ]);

  await createAuditLog({
    actorId: input.lecturerId,
    action: "workspace.delete",
    entityType: "workspace",
    entityId: input.workspaceId,
    metadata: {
      name: current.name,
      className: current.className,
      semester: current.semester,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}

export async function setWorkspaceBackground(input: {
  workspaceId: string;
  lecturerId: string;
  file: {
    fileName: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
  };
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<WorkspaceDetail> {
  const current = await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const previousKey = current.backgroundImageKey;

  const uploaded = await uploadWorkspaceBackground({
    ...input.file,
    workspaceId: input.workspaceId,
  });

  await db
    .update(workspace)
    .set({
      backgroundImageKey: uploaded.key,
      backgroundImageUrl: uploaded.url,
    })
    .where(eq(workspace.id, input.workspaceId));

  if (previousKey && previousKey !== uploaded.key) {
    await deleteWorkspaceObject(previousKey);
  }

  await createAuditLog({
    actorId: input.lecturerId,
    action: "workspace.background_update",
    entityType: "workspace",
    entityId: input.workspaceId,
    metadata: { key: uploaded.key },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return getLecturerWorkspaceDetail({
    workspaceId: input.workspaceId,
    lecturerId: input.lecturerId,
  });
}

export async function removeWorkspaceBackground(input: {
  workspaceId: string;
  lecturerId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<WorkspaceDetail> {
  const current = await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const previousKey = current.backgroundImageKey;

  if (!previousKey) {
    return getLecturerWorkspaceDetail({
      workspaceId: input.workspaceId,
      lecturerId: input.lecturerId,
    });
  }

  await db
    .update(workspace)
    .set({
      backgroundImageKey: null,
      backgroundImageUrl: null,
    })
    .where(eq(workspace.id, input.workspaceId));

  await deleteWorkspaceObject(previousKey);

  await createAuditLog({
    actorId: input.lecturerId,
    action: "workspace.background_remove",
    entityType: "workspace",
    entityId: input.workspaceId,
    metadata: { previousKey },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return getLecturerWorkspaceDetail({
    workspaceId: input.workspaceId,
    lecturerId: input.lecturerId,
  });
}

export async function uploadDescriptionImageForWorkspace(input: {
  workspaceId: string;
  lecturerId: string;
  file: {
    fileName: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
  };
}): Promise<{ key: string; url: string }> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const uploaded = await uploadWorkspaceDescriptionImage({
    ...input.file,
    workspaceId: input.workspaceId,
  });

  return {
    key: uploaded.key,
    url: toMediaProxyUrl(uploaded.key),
  };
}

export async function uploadTmpDescriptionImage(input: {
  lecturerId: string;
  file: {
    fileName: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
  };
}): Promise<{ key: string; url: string }> {
  const uploaded = await uploadWorkspaceTmpDescriptionImage({
    ...input.file,
    lecturerId: input.lecturerId,
  });

  logger.info(
    { key: uploaded.key, lecturerId: input.lecturerId },
    "Workspace tmp description image uploaded",
  );

  return {
    key: uploaded.key,
    url: toMediaProxyUrl(uploaded.key),
  };
}
