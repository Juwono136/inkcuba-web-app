import "server-only";

import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import { directoryOption } from "@/db/schema/directory";
import { createAuditLog } from "@/lib/audit";
import { BINUS_CAMPUSES } from "@/lib/auth/constants";
import {
  DIRECTORY_OPTION_CATEGORIES,
  type DirectoryOptionCategory,
  type DirectoryOptionListPage,
  type DirectoryOptionRecord,
} from "@/lib/directory/types";
import type {
  DirectoryOptionCreateInput,
  DirectoryOptionListQuery,
  DirectoryOptionReorderInput,
  DirectoryOptionUpdateInput,
} from "@/lib/directory/validators";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

function mapOption(
  row: typeof directoryOption.$inferSelect,
): DirectoryOptionRecord {
  return {
    id: row.id,
    category: row.category as DirectoryOptionCategory,
    label: row.label,
    value: row.value,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listDirectoryOptions(input?: {
  category?: DirectoryOptionCategory;
  activeOnly?: boolean;
}): Promise<DirectoryOptionRecord[]> {
  const conditions = [];
  if (input?.category) {
    conditions.push(eq(directoryOption.category, input.category));
  }
  if (input?.activeOnly) {
    conditions.push(eq(directoryOption.isActive, true));
  }

  const rows = await db
    .select()
    .from(directoryOption)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      asc(directoryOption.category),
      asc(directoryOption.sortOrder),
      asc(directoryOption.label),
    );

  return rows.map(mapOption);
}

export async function listDirectoryOptionsPage(
  query: DirectoryOptionListQuery,
): Promise<DirectoryOptionListPage> {
  const conditions = [];
  if (query.category) {
    conditions.push(eq(directoryOption.category, query.category));
  }
  if (query.activeOnly) {
    conditions.push(eq(directoryOption.isActive, true));
  }

  const search = query.q.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(directoryOption.label, pattern),
        ilike(directoryOption.value, pattern),
      )!,
    );
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.pageSize;

  const [totalRow] = await db
    .select({ value: count() })
    .from(directoryOption)
    .where(whereClause);

  const total = totalRow?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  const rows = await db
    .select()
    .from(directoryOption)
    .where(whereClause)
    .orderBy(
      asc(directoryOption.category),
      asc(directoryOption.sortOrder),
      asc(directoryOption.label),
    )
    .limit(query.pageSize)
    .offset(offset);

  return {
    items: rows.map(mapOption),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages,
  };
}

export async function getActiveDirectoryValues(
  category: DirectoryOptionCategory,
): Promise<string[]> {
  const rows = await listDirectoryOptions({ category, activeOnly: true });
  return rows.map((row) => row.value);
}

export async function assertDirectoryValue(
  category: DirectoryOptionCategory,
  value: string | null | undefined,
  fieldLabel: string,
): Promise<string | null> {
  if (value == null || value.trim() === "") return null;
  const trimmed = value.trim();
  const active = await getActiveDirectoryValues(category);
  if (!active.includes(trimmed)) {
    throw new ValidationError(
      `${fieldLabel} must be one of the active directory options`,
    );
  }
  return trimmed;
}

async function nextSortOrder(category: DirectoryOptionCategory): Promise<number> {
  const [row] = await db
    .select({ max: directoryOption.sortOrder })
    .from(directoryOption)
    .where(eq(directoryOption.category, category))
    .orderBy(desc(directoryOption.sortOrder))
    .limit(1);

  return (row?.max ?? -1) + 1;
}

export async function createDirectoryOption(input: {
  data: DirectoryOptionCreateInput;
  actorId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<DirectoryOptionRecord> {
  const label = input.data.label.trim();
  // Stored value is system-owned: mirrors label at create time, never edited via UI.
  const value = label;

  const existing = await db
    .select({ id: directoryOption.id })
    .from(directoryOption)
    .where(
      and(
        eq(directoryOption.category, input.data.category),
        eq(directoryOption.value, value),
      ),
    )
    .limit(1);

  if (existing[0]) {
    throw new ValidationError(
      "An option with this label already exists in this category",
    );
  }

  const sortOrder = await nextSortOrder(input.data.category);

  const [created] = await db
    .insert(directoryOption)
    .values({
      id: crypto.randomUUID(),
      category: input.data.category,
      label,
      value,
      sortOrder,
      isActive: input.data.isActive ?? true,
    })
    .returning();

  await createAuditLog({
    actorId: input.actorId,
    action: "directory_option.create",
    entityType: "directory_option",
    entityId: created.id,
    metadata: {
      category: created.category,
      label: created.label,
      value: created.value,
      sortOrder: created.sortOrder,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return mapOption(created);
}

export async function updateDirectoryOption(input: {
  id: string;
  data: DirectoryOptionUpdateInput;
  actorId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<DirectoryOptionRecord> {
  const rows = await db
    .select()
    .from(directoryOption)
    .where(eq(directoryOption.id, input.id))
    .limit(1);

  const current = rows[0];
  if (!current) throw new NotFoundError("Directory option not found");

  const nextLabel = input.data.label?.trim() ?? current.label;
  // Value stays immutable so existing profile references remain valid.

  if (nextLabel !== current.label) {
    const clash = await db
      .select({ id: directoryOption.id })
      .from(directoryOption)
      .where(
        and(
          eq(directoryOption.category, current.category),
          eq(directoryOption.label, nextLabel),
        ),
      )
      .limit(1);
    if (clash[0] && clash[0].id !== input.id) {
      throw new ValidationError(
        "An option with this label already exists in this category",
      );
    }
  }

  const [updated] = await db
    .update(directoryOption)
    .set({
      label: nextLabel,
      isActive: input.data.isActive ?? current.isActive,
      updatedAt: new Date(),
    })
    .where(eq(directoryOption.id, input.id))
    .returning();

  await createAuditLog({
    actorId: input.actorId,
    action: "directory_option.update",
    entityType: "directory_option",
    entityId: input.id,
    metadata: {
      from: {
        label: current.label,
        isActive: current.isActive,
      },
      to: {
        label: updated.label,
        isActive: updated.isActive,
      },
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return mapOption(updated);
}

/**
 * Reorder options within a category.
 * `orderedIds` must be a permutation of a contiguous segment of the
 * category's current sort order (typically one page without an active search).
 */
export async function reorderDirectoryOptions(input: {
  data: DirectoryOptionReorderInput;
  actorId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ updated: number }> {
  const { category, orderedIds } = input.data;
  const uniqueIds = new Set(orderedIds);
  if (uniqueIds.size !== orderedIds.length) {
    throw new ValidationError("Duplicate option ids in reorder payload");
  }

  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: directoryOption.id, sortOrder: directoryOption.sortOrder })
      .from(directoryOption)
      .where(eq(directoryOption.category, category))
      .orderBy(asc(directoryOption.sortOrder), asc(directoryOption.id));

    if (rows.length === 0) {
      throw new NotFoundError("No options found in this category");
    }

    const indexById = new Map(rows.map((row, index) => [row.id, index]));
    const indices: number[] = [];

    for (const id of orderedIds) {
      const index = indexById.get(id);
      if (index === undefined) {
        throw new ValidationError(
          "One or more options are missing or belong to another category",
        );
      }
      indices.push(index);
    }

    const minIndex = Math.min(...indices);
    const maxIndex = Math.max(...indices);
    if (maxIndex - minIndex + 1 !== orderedIds.length) {
      throw new ValidationError(
        "Reorder only works on a contiguous range. Clear search and try again.",
      );
    }

    const expectedSet = new Set(
      rows.slice(minIndex, maxIndex + 1).map((row) => row.id),
    );
    for (const id of orderedIds) {
      if (!expectedSet.has(id)) {
        throw new ValidationError(
          "Reorder set does not match the current contiguous range",
        );
      }
    }

    // Idempotent no-op when order is unchanged
    const currentSlice = rows.slice(minIndex, maxIndex + 1).map((row) => row.id);
    const unchanged = currentSlice.every((id, i) => id === orderedIds[i]);
    if (unchanged) {
      return { updated: 0, fromIds: currentSlice, toIds: orderedIds };
    }

    const now = new Date();
    let updated = 0;
    for (let offset = 0; offset < orderedIds.length; offset++) {
      const id = orderedIds[offset]!;
      const nextSort = minIndex + offset;
      const current = rows[indexById.get(id)!]!;
      if (current.sortOrder === nextSort) continue;
      await tx
        .update(directoryOption)
        .set({ sortOrder: nextSort, updatedAt: now })
        .where(eq(directoryOption.id, id));
      updated += 1;
    }

    return { updated, fromIds: currentSlice, toIds: orderedIds };
  });

  if (result.updated > 0) {
    await createAuditLog({
      actorId: input.actorId,
      action: "directory_option.reorder",
      entityType: "directory_option",
      entityId: category,
      metadata: {
        category,
        fromIds: result.fromIds,
        toIds: result.toIds,
        updated: result.updated,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  }

  return { updated: result.updated };
}

export async function deleteDirectoryOption(input: {
  id: string;
  actorId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ id: string }> {
  const rows = await db
    .select()
    .from(directoryOption)
    .where(eq(directoryOption.id, input.id))
    .limit(1);

  const current = rows[0];
  if (!current) {
    // Idempotent
    return { id: input.id };
  }

  await db.delete(directoryOption).where(eq(directoryOption.id, input.id));

  await createAuditLog({
    actorId: input.actorId,
    action: "directory_option.delete",
    entityType: "directory_option",
    entityId: input.id,
    metadata: {
      category: current.category,
      label: current.label,
      value: current.value,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return { id: input.id };
}

/** Seed default campuses if the category is empty (idempotent). */
export async function ensureDefaultDirectoryOptions(): Promise<void> {
  try {
    const existing = await listDirectoryOptions({ category: "campus" });
    if (existing.length > 0) return;

    for (const [index, campus] of BINUS_CAMPUSES.entries()) {
      await db.insert(directoryOption).values({
        id: crypto.randomUUID(),
        category: "campus",
        label: campus,
        value: campus,
        sortOrder: index,
        isActive: true,
      });
    }

    logger.info(
      { count: BINUS_CAMPUSES.length },
      "Seeded default campus directory options",
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to seed directory options");
  }
}

export { DIRECTORY_OPTION_CATEGORIES };
