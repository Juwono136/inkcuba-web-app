import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { roleFieldPermission } from "@/db/schema/role-field-permissions";
import { createAuditLog } from "@/lib/audit";
import type { UserRole } from "@/lib/auth/permissions";
import {
  DEFAULT_ROLE_FIELD_EDITABLE,
  ROLE_RELEVANT_IDENTITY_FIELDS,
  SETTINGS_IDENTITY_FIELDS,
  type RoleFieldPermissionMatrix,
  type RoleFieldPermissionRecord,
  type SettingsIdentityField,
} from "@/lib/role-field-permissions/types";
import type { RoleFieldPermissionBulkUpsertInput } from "@/lib/role-field-permissions/validators";
import { logger } from "@/lib/logger";

function emptyMatrix(): RoleFieldPermissionMatrix {
  const matrix = {} as RoleFieldPermissionMatrix;
  for (const role of ["STUDENT", "LECTURER", "ADMIN"] as UserRole[]) {
    matrix[role] = {} as Record<SettingsIdentityField, boolean>;
    for (const field of SETTINGS_IDENTITY_FIELDS) {
      matrix[role][field] = false;
    }
  }
  return matrix;
}

function applyDefaults(matrix: RoleFieldPermissionMatrix): RoleFieldPermissionMatrix {
  for (const role of ["STUDENT", "LECTURER", "ADMIN"] as UserRole[]) {
    const defaults = DEFAULT_ROLE_FIELD_EDITABLE[role];
    for (const field of SETTINGS_IDENTITY_FIELDS) {
      if (defaults[field]) {
        matrix[role][field] = true;
      }
    }
  }
  return matrix;
}

function mapRow(
  row: typeof roleFieldPermission.$inferSelect,
): RoleFieldPermissionRecord {
  return {
    id: row.id,
    role: row.role as UserRole,
    field: row.field as SettingsIdentityField,
    editableBySelf: row.editableBySelf,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Idempotent seed of (role, field) rows with product defaults. */
export async function ensureRoleFieldPermissions(): Promise<void> {
  try {
    const existing = await db.select().from(roleFieldPermission);
    const have = new Set(existing.map((row) => `${row.role}:${row.field}`));

    const toInsert: (typeof roleFieldPermission.$inferInsert)[] = [];
    for (const role of ["STUDENT", "LECTURER", "ADMIN"] as UserRole[]) {
      for (const field of SETTINGS_IDENTITY_FIELDS) {
        const key = `${role}:${field}`;
        if (have.has(key)) continue;
        const editable = Boolean(DEFAULT_ROLE_FIELD_EDITABLE[role][field]);
        toInsert.push({
          id: crypto.randomUUID(),
          role,
          field,
          editableBySelf: editable,
        });
      }
    }

    if (toInsert.length === 0) return;
    await db.insert(roleFieldPermission).values(toInsert);
    logger.info(
      { count: toInsert.length },
      "Seeded role field permissions",
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to seed role field permissions");
  }
}

export async function getRoleFieldPermissionMatrix(): Promise<RoleFieldPermissionMatrix> {
  await ensureRoleFieldPermissions();
  const rows = await db.select().from(roleFieldPermission);
  const matrix = applyDefaults(emptyMatrix());
  for (const row of rows) {
    matrix[row.role as UserRole][row.field as SettingsIdentityField] =
      row.editableBySelf;
  }
  return matrix;
}

export async function getEditableFieldsForRole(
  role: UserRole,
): Promise<SettingsIdentityField[]> {
  const matrix = await getRoleFieldPermissionMatrix();
  const relevant = ROLE_RELEVANT_IDENTITY_FIELDS[role];
  return relevant.filter((field) => matrix[role][field]);
}

export async function listRoleFieldPermissions(): Promise<
  RoleFieldPermissionRecord[]
> {
  await ensureRoleFieldPermissions();
  const rows = await db.select().from(roleFieldPermission);
  return rows.map(mapRow);
}

export async function bulkUpsertRoleFieldPermissions(input: {
  data: RoleFieldPermissionBulkUpsertInput;
  actorId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<RoleFieldPermissionMatrix> {
  await ensureRoleFieldPermissions();

  const before = await getRoleFieldPermissionMatrix();
  let updated = 0;

  for (const item of input.data.items) {
    // Ignore irrelevant fields for a role (e.g. nidn for STUDENT) — force false.
    const relevant = ROLE_RELEVANT_IDENTITY_FIELDS[item.role];
    const editableBySelf = relevant.includes(item.field)
      ? item.editableBySelf
      : false;

    const existing = await db
      .select({ id: roleFieldPermission.id })
      .from(roleFieldPermission)
      .where(
        and(
          eq(roleFieldPermission.role, item.role),
          eq(roleFieldPermission.field, item.field),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(roleFieldPermission)
        .set({ editableBySelf, updatedAt: new Date() })
        .where(eq(roleFieldPermission.id, existing[0].id));
    } else {
      await db.insert(roleFieldPermission).values({
        id: crypto.randomUUID(),
        role: item.role,
        field: item.field,
        editableBySelf,
      });
    }
    updated += 1;
  }

  const after = await getRoleFieldPermissionMatrix();

  await createAuditLog({
    actorId: input.actorId,
    action: "role_field_permission.update",
    entityType: "role_field_permission",
    entityId: "matrix",
    metadata: { updated, before, after },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return after;
}
