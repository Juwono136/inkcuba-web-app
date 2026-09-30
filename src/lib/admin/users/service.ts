import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  session as sessionTable,
  user as userTable,
} from "@/db/schema/auth";
import { loginHistory } from "@/db/schema/login-history";
import {
  lecturerProfile,
  studentProfile,
} from "@/db/schema/profiles";
import { USER_SOFT_DELETE_RETENTION_DAYS } from "@/lib/admin/users/constants";
import type {
  AdminUserDetail,
  AdminUserListItem,
  AdminUserListPage,
} from "@/lib/admin/users/types";
import type {
  AdminUserListQuery,
  AdminUserPatchInput,
} from "@/lib/admin/users/validators";
import { createAuditLog } from "@/lib/audit";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/api/errors";
import { resolveUserRole, type UserRole } from "@/lib/auth/permissions";
import { formatUserRole } from "@/lib/auth/role-labels";
import { extractAvatarStorageKey } from "@/lib/media/resolve-avatar-url";
import { logger } from "@/lib/logger";
import { deleteUserAvatar } from "@/lib/storage/avatar";

function emptyOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function retentionCutoff(days = USER_SOFT_DELETE_RETENTION_DAYS): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysUntilPurge(deletedAt: Date | null): number | null {
  if (!deletedAt) return null;
  const purgeAt =
    deletedAt.getTime() +
    USER_SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((purgeAt - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

function binusianIdFor(
  role: UserRole,
  nim: string | null,
  nidn: string | null,
): string | null {
  if (role === "STUDENT") return emptyOrNull(nim);
  if (role === "LECTURER") return emptyOrNull(nidn);
  return emptyOrNull(nim) ?? emptyOrNull(nidn);
}

type UserRow = typeof userTable.$inferSelect;

function mapListItem(
  row: UserRow & { lastLoginAt: Date | string | null },
): AdminUserListItem {
  const role = resolveUserRole(row);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    role,
    roleLabel: formatUserRole(role),
    campus: emptyOrNull(row.campus),
    binusianId: binusianIdFor(role, row.nim, row.nidn),
    isActive: row.isActive,
    emailVerified: row.emailVerified,
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date(0).toISOString(),
    deletedAt: toIso(row.deletedAt),
    lastLoginAt: toIso(row.lastLoginAt),
    daysUntilPurge: daysUntilPurge(
      row.deletedAt instanceof Date
        ? row.deletedAt
        : row.deletedAt
          ? new Date(row.deletedAt)
          : null,
    ),
  };
}

async function loadDetailExtras(
  userId: string,
  role: UserRole,
): Promise<Omit<
  AdminUserDetail,
  keyof AdminUserListItem | "nim" | "nidn"
> & { nim: string | null; nidn: string | null }> {
  const base = {
    nim: null as string | null,
    nidn: null as string | null,
    major: null as string | null,
    batch: null as string | null,
    semester: null as string | null,
    isAlumni: false,
    alumniLabel: null as string | null,
    department: null as string | null,
    title: null as string | null,
    bio: null as string | null,
    skills: [] as string[],
    linkedinUrl: null as string | null,
    githubUrl: null as string | null,
    instagramUrl: null as string | null,
    youtubeUrl: null as string | null,
    twitterUrl: null as string | null,
    tiktokUrl: null as string | null,
    portfolioLinks: [] as { label: string; url: string }[],
  };

  if (role === "STUDENT") {
    const rows = await db
      .select()
      .from(studentProfile)
      .where(eq(studentProfile.userId, userId))
      .limit(1);
    const profile = rows[0];
    if (!profile) return base;

    const batch = emptyOrNull(profile.batch);
    return {
      ...base,
      major: emptyOrNull(profile.major),
      batch,
      semester: emptyOrNull(profile.semester),
      isAlumni: profile.isAlumni,
      alumniLabel: profile.isAlumni
        ? batch
          ? `Alumni BINUS · Batch ${batch}`
          : "Alumni BINUS"
        : null,
      bio: emptyOrNull(profile.bio),
      skills: profile.skills ?? [],
      linkedinUrl: emptyOrNull(profile.linkedinUrl),
      githubUrl: emptyOrNull(profile.githubUrl),
      instagramUrl: emptyOrNull(profile.instagramUrl),
      youtubeUrl: emptyOrNull(profile.youtubeUrl),
      twitterUrl: emptyOrNull(profile.twitterUrl),
      tiktokUrl: emptyOrNull(profile.tiktokUrl),
      portfolioLinks: profile.portfolioLinks ?? [],
    };
  }

  if (role === "LECTURER") {
    const rows = await db
      .select()
      .from(lecturerProfile)
      .where(eq(lecturerProfile.userId, userId))
      .limit(1);
    const profile = rows[0];
    if (!profile) return base;

    return {
      ...base,
      major: emptyOrNull(profile.major),
      department: emptyOrNull(profile.department),
      title: emptyOrNull(profile.title),
      bio: emptyOrNull(profile.bio),
      skills: profile.skills ?? [],
      linkedinUrl: emptyOrNull(profile.linkedinUrl),
      githubUrl: emptyOrNull(profile.githubUrl),
      instagramUrl: emptyOrNull(profile.instagramUrl),
      youtubeUrl: emptyOrNull(profile.youtubeUrl),
      twitterUrl: emptyOrNull(profile.twitterUrl),
      tiktokUrl: emptyOrNull(profile.tiktokUrl),
      portfolioLinks: profile.portfolioLinks ?? [],
    };
  }

  return base;
}

async function getUserRow(
  userId: string,
  options?: { includeDeleted?: boolean },
): Promise<(UserRow & { lastLoginAt: Date | string | null }) | null> {
  const lastLoginSq = db
    .select({
      userId: loginHistory.userId,
      lastLoginAt: sql<Date>`max(${loginHistory.createdAt})`.as("last_login_at"),
    })
    .from(loginHistory)
    .groupBy(loginHistory.userId)
    .as("last_login_sq");

  const conditions: SQL[] = [eq(userTable.id, userId)];
  if (!options?.includeDeleted) {
    conditions.push(isNull(userTable.deletedAt));
  }

  const rows = await db
    .select({
      user: userTable,
      lastLoginAt: lastLoginSq.lastLoginAt,
    })
    .from(userTable)
    .leftJoin(lastLoginSq, eq(userTable.id, lastLoginSq.userId))
    .where(and(...conditions))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return { ...row.user, lastLoginAt: row.lastLoginAt ?? null };
}

async function toDetail(
  row: UserRow & { lastLoginAt: Date | string | null },
): Promise<AdminUserDetail> {
  const listItem = mapListItem(row);
  const extras = await loadDetailExtras(row.id, listItem.role);

  return {
    ...listItem,
    ...extras,
    nim: emptyOrNull(row.nim),
    nidn: emptyOrNull(row.nidn),
  };
}

async function countActiveAdmins(excludeUserId?: string): Promise<number> {
  const conditions: SQL[] = [
    eq(userTable.role, "ADMIN"),
    isNull(userTable.deletedAt),
    eq(userTable.isActive, true),
  ];

  if (excludeUserId) {
    conditions.push(sql`${userTable.id} <> ${excludeUserId}`);
  }

  const rows = await db
    .select({ value: count() })
    .from(userTable)
    .where(and(...conditions));

  return rows[0]?.value ?? 0;
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
}

/** Hard-delete soft-deleted users past the retention window (idempotent). */
export async function pruneExpiredSoftDeletedUsers(): Promise<number> {
  const cutoff = retentionCutoff();

  try {
    const expired = await db
      .select({ id: userTable.id, image: userTable.image })
      .from(userTable)
      .where(and(isNotNull(userTable.deletedAt), lt(userTable.deletedAt, cutoff)))
      .limit(100);

    let purged = 0;

    for (const row of expired) {
      await hardDeleteUserInternal(row.id, row.image, {
        actorId: null,
        reason: "retention_expired",
      });
      purged += 1;
    }

    return purged;
  } catch (error) {
    logger.error({ err: error }, "Failed to prune expired soft-deleted users");
    return 0;
  }
}

async function hardDeleteUserInternal(
  userId: string,
  image: string | null,
  meta: {
    actorId: string | null;
    reason: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<void> {
  const storageKey = image ? extractAvatarStorageKey(image) : null;

  // Delete DB row first (cascades sessions/accounts/profiles/login_history).
  // Avatar cleanup is best-effort after commit.
  await db.delete(userTable).where(eq(userTable.id, userId));

  if (storageKey) {
    await deleteUserAvatar(storageKey, userId);
  }

  await createAuditLog({
    actorId: meta.actorId,
    action: "user.hard_delete",
    entityType: "user",
    entityId: userId,
    metadata: { reason: meta.reason },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}

export async function listAdminUsers(
  query: AdminUserListQuery,
): Promise<AdminUserListPage> {
  // Opportunistic retention cleanup (same pattern as login history prune).
  void pruneExpiredSoftDeletedUsers();

  const lastLoginSq = db
    .select({
      userId: loginHistory.userId,
      lastLoginAt: sql<Date>`max(${loginHistory.createdAt})`.as("last_login_at"),
    })
    .from(loginHistory)
    .groupBy(loginHistory.userId)
    .as("last_login_sq");

  const conditions: SQL[] = [];

  if (query.trash) {
    conditions.push(isNotNull(userTable.deletedAt));
  } else {
    conditions.push(isNull(userTable.deletedAt));
  }

  if (query.role !== "ALL") {
    conditions.push(eq(userTable.role, query.role));
  }

  if (!query.trash && query.status === "ACTIVE") {
    conditions.push(eq(userTable.isActive, true));
  } else if (!query.trash && query.status === "INACTIVE") {
    conditions.push(eq(userTable.isActive, false));
  }

  const search = query.q.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(userTable.name, pattern),
        ilike(userTable.email, pattern),
        ilike(userTable.nim, pattern),
        ilike(userTable.nidn, pattern),
        ilike(userTable.campus, pattern),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const sortDir = query.sortDir === "asc" ? asc : desc;
  let orderByClause: SQL;

  switch (query.sortBy) {
    case "name":
      orderByClause = sortDir(userTable.name);
      break;
    case "email":
      orderByClause = sortDir(userTable.email);
      break;
    case "role":
      orderByClause = sortDir(userTable.role);
      break;
    case "isActive":
      orderByClause = sortDir(userTable.isActive);
      break;
    case "lastLoginAt":
      orderByClause = sortDir(lastLoginSq.lastLoginAt);
      break;
    case "createdAt":
    default:
      orderByClause = sortDir(userTable.createdAt);
      break;
  }

  const offset = (query.page - 1) * query.pageSize;

  const [totalRow] = await db
    .select({ value: count() })
    .from(userTable)
    .where(whereClause);

  const total = totalRow?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  const rows = await db
    .select({
      user: userTable,
      lastLoginAt: lastLoginSq.lastLoginAt,
    })
    .from(userTable)
    .leftJoin(lastLoginSq, eq(userTable.id, lastLoginSq.userId))
    .where(whereClause)
    .orderBy(orderByClause, asc(userTable.id))
    .limit(query.pageSize)
    .offset(offset);

  return {
    items: rows.map((row) =>
      mapListItem({ ...row.user, lastLoginAt: row.lastLoginAt ?? null }),
    ),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages,
    trash: query.trash,
  };
}

export async function getAdminUserDetail(
  userId: string,
  options?: { includeDeleted?: boolean },
): Promise<AdminUserDetail> {
  const row = await getUserRow(userId, {
    includeDeleted: options?.includeDeleted ?? true,
  });

  if (!row) {
    throw new NotFoundError("User not found");
  }

  return toDetail(row);
}

export async function patchAdminUser(input: {
  actorId: string;
  userId: string;
  patch: AdminUserPatchInput;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<AdminUserDetail> {
  const row = await getUserRow(input.userId, { includeDeleted: false });

  if (!row) {
    throw new NotFoundError("User not found");
  }

  if (row.deletedAt) {
    throw new ValidationError("Restore this user from trash before editing");
  }

  const currentRole = resolveUserRole(row);
  const nextRole = input.patch.role ?? currentRole;
  const nextActive =
    input.patch.isActive !== undefined ? input.patch.isActive : row.isActive;

  const roleChanging = input.patch.role !== undefined && input.patch.role !== currentRole;
  const activeChanging =
    input.patch.isActive !== undefined && input.patch.isActive !== row.isActive;

  if (!roleChanging && !activeChanging) {
    // Idempotent no-op
    return toDetail(row);
  }

  if (input.userId === input.actorId) {
    if (roleChanging) {
      throw new ForbiddenError("You cannot change your own role");
    }
    if (activeChanging && !nextActive) {
      throw new ForbiddenError("You cannot deactivate your own account");
    }
  }

  if (
    currentRole === "ADMIN" &&
    (roleChanging || (activeChanging && !nextActive))
  ) {
    const otherAdmins = await countActiveAdmins(input.userId);
    if (otherAdmins < 1) {
      throw new ForbiddenError(
        "Cannot demote or deactivate the last active administrator",
      );
    }
  }

  await db
    .update(userTable)
    .set({
      ...(roleChanging ? { role: nextRole } : {}),
      ...(activeChanging ? { isActive: nextActive } : {}),
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, input.userId));

  if (activeChanging && !nextActive) {
    await revokeAllUserSessions(input.userId);
  }

  await createAuditLog({
    actorId: input.actorId,
    action: "user.update",
    entityType: "user",
    entityId: input.userId,
    metadata: {
      role: roleChanging ? { from: currentRole, to: nextRole } : undefined,
      isActive: activeChanging
        ? { from: row.isActive, to: nextActive }
        : undefined,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return getAdminUserDetail(input.userId, { includeDeleted: false });
}

export async function softDeleteAdminUser(input: {
  actorId: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<AdminUserDetail> {
  if (input.userId === input.actorId) {
    throw new ForbiddenError("You cannot delete your own account");
  }

  const row = await getUserRow(input.userId, { includeDeleted: true });

  if (!row) {
    throw new NotFoundError("User not found");
  }

  // Idempotent: already in trash
  if (row.deletedAt) {
    return toDetail(row);
  }

  const role = resolveUserRole(row);
  if (role === "ADMIN") {
    const otherAdmins = await countActiveAdmins(input.userId);
    if (otherAdmins < 1) {
      throw new ForbiddenError(
        "Cannot delete the last active administrator",
      );
    }
  }

  const now = new Date();

  await db
    .update(userTable)
    .set({
      deletedAt: now,
      isActive: false,
      updatedAt: now,
    })
    .where(and(eq(userTable.id, input.userId), isNull(userTable.deletedAt)));

  await revokeAllUserSessions(input.userId);

  await createAuditLog({
    actorId: input.actorId,
    action: "user.soft_delete",
    entityType: "user",
    entityId: input.userId,
    metadata: { retentionDays: USER_SOFT_DELETE_RETENTION_DAYS },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return getAdminUserDetail(input.userId, { includeDeleted: true });
}

export async function restoreAdminUser(input: {
  actorId: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<AdminUserDetail> {
  const row = await getUserRow(input.userId, { includeDeleted: true });

  if (!row) {
    throw new NotFoundError("User not found");
  }

  // Idempotent: already restored
  if (!row.deletedAt) {
    return toDetail(row);
  }

  await db
    .update(userTable)
    .set({
      deletedAt: null,
      // Keep inactive until admin explicitly reactivates — safer default.
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, input.userId));

  await createAuditLog({
    actorId: input.actorId,
    action: "user.restore",
    entityType: "user",
    entityId: input.userId,
    metadata: { remainsInactive: true },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return getAdminUserDetail(input.userId, { includeDeleted: false });
}

export async function hardDeleteAdminUser(input: {
  actorId: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ id: string }> {
  if (input.userId === input.actorId) {
    throw new ForbiddenError("You cannot permanently delete your own account");
  }

  const rows = await db
    .select({
      id: userTable.id,
      image: userTable.image,
      deletedAt: userTable.deletedAt,
      role: userTable.role,
    })
    .from(userTable)
    .where(eq(userTable.id, input.userId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    // Idempotent: already gone
    return { id: input.userId };
  }

  if (!row.deletedAt) {
    throw new ValidationError(
      "Move the user to trash before permanently removing them",
    );
  }

  await hardDeleteUserInternal(row.id, row.image, {
    actorId: input.actorId,
    reason: "admin_purge",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return { id: input.userId };
}
