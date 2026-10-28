import "server-only";

import { randomInt } from "node:crypto";
import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import {
  assignment,
  assignmentGroup,
  assignmentGroupMember,
  workspaceMember,
} from "@/db/schema/workspaces";
import { createAuditLog } from "@/lib/audit";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/api/errors";
import { getRedisClient } from "@/lib/redis";
import { toMediaProxyUrl } from "@/lib/workspaces/sanitize-description";
import {
  evenGroupSizes,
  groupSlotCount,
  SUBMISSION_GROUP_ADD_MAX,
  SUBMISSION_GROUP_TOTAL_MAX,
  type SubmissionGroupMethod,
  type SubmissionGroupsPayload,
  type SubmissionMember,
} from "@/lib/workspaces/submissions/types";
import type { SubmissionGroupsQuery } from "@/lib/workspaces/submissions/validators";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type ActorMeta = {
  actorId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function searchPattern(q: string): string | null {
  const safe = q.trim().replace(/[%_]/g, "");
  if (!safe) return null;
  return `%${safe}%`;
}

function memberImage(image: string | null): string | null {
  if (!image) return null;
  if (image.startsWith("http") || image.startsWith("/")) return image;
  return toMediaProxyUrl(image);
}

function mapUser(row: {
  id: string;
  name: string;
  email: string;
  nim: string | null;
  image: string | null;
}): SubmissionMember {
  return {
    userId: row.id,
    name: row.name,
    email: row.email,
    nim: row.nim,
    image: memberImage(row.image),
  };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = randomInt(0, index + 1);
    const current = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = current;
  }
  return copy;
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

async function lockAssignment(tx: Tx, assignmentId: string, workspaceId: string) {
  const rows = await tx
    .select()
    .from(assignment)
    .where(
      and(eq(assignment.id, assignmentId), eq(assignment.workspaceId, workspaceId)),
    )
    .for("update")
    .limit(1);

  const row = rows[0];
  if (!row) throw new NotFoundError("Submission not found");
  return row;
}

async function activeStudentIds(tx: Tx, workspaceId: string): Promise<string[]> {
  const rows = await tx
    .select({ userId: workspaceMember.userId })
    .from(workspaceMember)
    .innerJoin(userTable, eq(userTable.id, workspaceMember.userId))
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.status, "ACTIVE"),
        eq(userTable.role, "STUDENT"),
        eq(userTable.isActive, true),
        sql`${userTable.deletedAt} is null`,
      ),
    )
    .orderBy(asc(userTable.name));

  return rows.map((row) => row.userId);
}

function nextGroupName(names: string[]): string {
  let max = 0;
  for (const name of names) {
    const match = /^Group (\d+)$/.exec(name.trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `Group ${max > 0 ? max + 1 : names.length + 1}`;
}

export async function deleteUserGroupsInWorkspace(
  tx: Tx,
  workspaceId: string,
  userId: string,
): Promise<void> {
  await tx.delete(assignmentGroupMember).where(
    and(
      eq(assignmentGroupMember.userId, userId),
      inArray(
        assignmentGroupMember.assignmentId,
        tx
          .select({ id: assignment.id })
          .from(assignment)
          .where(eq(assignment.workspaceId, workspaceId)),
      ),
    ),
  );
}

export async function ensureEmptyGroups(
  tx: Tx,
  input: { assignmentId: string; workspaceId: string; maxGroupSize: number },
): Promise<void> {
  const existing = await tx
    .select({ id: assignmentGroup.id })
    .from(assignmentGroup)
    .where(eq(assignmentGroup.assignmentId, input.assignmentId));

  if (existing.length > 0) return;

  const students = await activeStudentIds(tx, input.workspaceId);
  const slots = groupSlotCount(students.length, input.maxGroupSize);
  const now = new Date();

  await tx.insert(assignmentGroup).values(
    Array.from({ length: slots }, (_, index) => ({
      id: crypto.randomUUID(),
      assignmentId: input.assignmentId,
      name: `Group ${index + 1}`,
      maxMembers: input.maxGroupSize,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export async function listSubmissionGroups(input: {
  workspaceId: string;
  assignmentId: string;
  query: SubmissionGroupsQuery;
}): Promise<SubmissionGroupsPayload> {
  const submissionRows = await db
    .select()
    .from(assignment)
    .where(
      and(
        eq(assignment.id, input.assignmentId),
        eq(assignment.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);

  const submission = submissionRows[0];
  if (!submission) throw new NotFoundError("Submission not found");
  if (submission.type !== "GROUP") {
    throw new ValidationError("This submission does not use groups");
  }

  const pattern = searchPattern(input.query.q);
  const nameFilter = pattern
    ? or(ilike(userTable.name, pattern), ilike(userTable.nim, pattern))
    : undefined;

  const groupRows = await db
    .select()
    .from(assignmentGroup)
    .where(eq(assignmentGroup.assignmentId, submission.id))
    .orderBy(asc(assignmentGroup.createdAt), asc(assignmentGroup.name));

  const countRows = await db
    .select({
      groupId: assignmentGroupMember.groupId,
      value: count(),
    })
    .from(assignmentGroupMember)
    .where(eq(assignmentGroupMember.assignmentId, submission.id))
    .groupBy(assignmentGroupMember.groupId);

  const counts = new Map(countRows.map((row) => [row.groupId, Number(row.value)]));

  const page = input.query.page;
  const pageSize = input.query.pageSize;
  const pageGroups = groupRows.slice((page - 1) * pageSize, page * pageSize);
  const pageIds = pageGroups.map((group) => group.id);

  const memberRows =
    pageIds.length === 0
      ? []
      : await db
          .select({
            groupId: assignmentGroupMember.groupId,
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            nim: userTable.nim,
            image: userTable.image,
          })
          .from(assignmentGroupMember)
          .innerJoin(userTable, eq(userTable.id, assignmentGroupMember.userId))
          .where(
            and(
              inArray(assignmentGroupMember.groupId, pageIds),
              nameFilter,
            ),
          )
          .orderBy(asc(userTable.name));

  const membersByGroup = new Map<string, SubmissionMember[]>();
  for (const row of memberRows) {
    const list = membersByGroup.get(row.groupId) ?? [];
    list.push(
      mapUser({
        id: row.id,
        name: row.name,
        email: row.email,
        nim: row.nim,
        image: row.image,
      }),
    );
    membersByGroup.set(row.groupId, list);
  }

  const activeCountRows = await db
    .select({ value: count() })
    .from(workspaceMember)
    .innerJoin(userTable, eq(userTable.id, workspaceMember.userId))
    .where(
      and(
        eq(workspaceMember.workspaceId, input.workspaceId),
        eq(workspaceMember.status, "ACTIVE"),
        eq(userTable.role, "STUDENT"),
        eq(userTable.isActive, true),
        sql`${userTable.deletedAt} is null`,
      ),
    );

  const unassignedConditions = [
    eq(workspaceMember.workspaceId, input.workspaceId),
    eq(workspaceMember.status, "ACTIVE"),
    eq(userTable.role, "STUDENT"),
    eq(userTable.isActive, true),
    sql`${userTable.deletedAt} is null`,
    sql`not exists (
      select 1 from ${assignmentGroupMember}
      where ${assignmentGroupMember.userId} = ${userTable.id}
        and ${assignmentGroupMember.assignmentId} = ${submission.id}
    )`,
  ];
  if (nameFilter) unassignedConditions.push(nameFilter);

  const unassignedWhere = and(...unassignedConditions);
  const unassignedTotalRows = await db
    .select({ value: count() })
    .from(workspaceMember)
    .innerJoin(userTable, eq(userTable.id, workspaceMember.userId))
    .where(unassignedWhere);

  const unassignedPageSize = pageSize;
  const unassignedOffset = (input.query.unassignedPage - 1) * unassignedPageSize;
  const unassignedRows = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      nim: userTable.nim,
      image: userTable.image,
    })
    .from(workspaceMember)
    .innerJoin(userTable, eq(userTable.id, workspaceMember.userId))
    .where(unassignedWhere)
    .orderBy(asc(userTable.name))
    .limit(unassignedPageSize)
    .offset(unassignedOffset);

  const unassignedTotal = Number(unassignedTotalRows[0]?.value ?? 0);
  const groupTotal = groupRows.length;
  const seatCapacity = groupRows.reduce(
    (sum, group) => sum + group.maxMembers,
    0,
  );

  const method =
    submission.groupMethod === "RANDOM" || submission.groupMethod === "SELF_SELECT"
      ? submission.groupMethod
      : submission.groupMethod === "MANUAL"
        ? "SELF_SELECT"
        : null;

  return {
    assignmentId: submission.id,
    type: "GROUP",
    status: submission.status,
    groupMethod: method,
    maxGroupSize: submission.maxGroupSize,
    activeStudentCount: Number(activeCountRows[0]?.value ?? 0),
    seatCapacity,
    groups: {
      items: pageGroups.map((group) => ({
        id: group.id,
        name: group.name,
        maxMembers: group.maxMembers,
        memberCount: counts.get(group.id) ?? 0,
        members: membersByGroup.get(group.id) ?? [],
      })),
      total: groupTotal,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(groupTotal / pageSize)),
    },
    unassigned: {
      items: [
        {
          id: "unassigned",
          name: "Unassigned",
          maxMembers: unassignedTotal,
          memberCount: unassignedTotal,
          members: unassignedRows.map(mapUser),
        },
      ],
      total: unassignedTotal,
      page: input.query.unassignedPage,
      pageSize: unassignedPageSize,
      totalPages: Math.max(1, Math.ceil(unassignedTotal / unassignedPageSize)),
    },
    groupOptions: groupRows.map((group) => ({
      id: group.id,
      name: group.name,
      memberCount: counts.get(group.id) ?? 0,
      maxMembers: group.maxMembers,
    })),
  };
}

const GROUP_ADD_PENDING_TTL_SEC = 60;
const GROUP_ADD_RESULT_TTL_SEC = 10 * 60;

export type AddedSubmissionGroup = { id: string; name: string };

export async function addSubmissionGroups(input: {
  workspaceId: string;
  assignmentId: string;
  count: number;
  idempotencyKey?: string | null;
  meta: ActorMeta;
}): Promise<{ count: number; groups: AddedSubmissionGroup[] }> {
  const count = input.count;
  if (!Number.isInteger(count) || count < 1 || count > SUBMISSION_GROUP_ADD_MAX) {
    throw new ValidationError(
      `Add between 1 and ${SUBMISSION_GROUP_ADD_MAX} groups at once`,
    );
  }

  const cacheKey = input.idempotencyKey
    ? `submission:group-add:${input.meta.actorId}:${input.assignmentId}:${input.idempotencyKey}`
    : null;

  if (cacheKey) {
    const redis = getRedisClient();
    const acquired = await redis.set(
      cacheKey,
      "pending",
      "EX",
      GROUP_ADD_PENDING_TTL_SEC,
      "NX",
    );
    if (acquired !== "OK") {
      const existing = await redis.get(cacheKey);
      if (existing && existing !== "pending") {
        try {
          const parsed = JSON.parse(existing) as {
            count: number;
            groups: AddedSubmissionGroup[];
          };
          if (parsed && typeof parsed.count === "number" && Array.isArray(parsed.groups)) {
            return parsed;
          }
        } catch {
          // Stored value is unusable. Drop it so a fresh confirm can proceed.
        }
        await redis.del(cacheKey);
      }
      throw new ConflictError(
        "These groups are already being added. Wait a moment, then try again.",
      );
    }
  }

  let created: { count: number; groups: AddedSubmissionGroup[] };
  try {
    created = await insertEmptyGroups(input);
  } catch (error) {
    if (cacheKey) await getRedisClient().del(cacheKey);
    throw error;
  }

  if (cacheKey) {
    try {
      await getRedisClient().set(
        cacheKey,
        JSON.stringify(created),
        "EX",
        GROUP_ADD_RESULT_TTL_SEC,
      );
    } catch {
      // The groups are already saved. Leave the pending key so a fast retry
      // does not create a second copy before the lock expires.
    }
  }
  return created;
}

async function insertEmptyGroups(input: {
  workspaceId: string;
  assignmentId: string;
  count: number;
  meta: ActorMeta;
}): Promise<{ count: number; groups: AddedSubmissionGroup[] }> {
  return db.transaction(async (tx) => {
    const submission = await lockAssignment(tx, input.assignmentId, input.workspaceId);
    if (submission.type !== "GROUP" || submission.maxGroupSize == null) {
      throw new ValidationError("This submission does not use groups");
    }
    if (submission.status === "CLOSED") {
      throw new ValidationError("Closed submissions cannot be changed");
    }

    const existing = await tx
      .select({ name: assignmentGroup.name })
      .from(assignmentGroup)
      .where(eq(assignmentGroup.assignmentId, submission.id));

    if (existing.length + input.count > SUBMISSION_GROUP_TOTAL_MAX) {
      const room = Math.max(0, SUBMISSION_GROUP_TOTAL_MAX - existing.length);
      throw new ValidationError(
        room === 0
          ? `This submission already has the maximum of ${SUBMISSION_GROUP_TOTAL_MAX} groups`
          : `You can add ${room} more groups. A submission holds at most ${SUBMISSION_GROUP_TOTAL_MAX}`,
      );
    }

    const names = existing.map((row) => row.name);
    const now = new Date();
    const rows = Array.from({ length: input.count }, () => {
      const name = nextGroupName(names);
      names.push(name);
      return {
        id: crypto.randomUUID(),
        assignmentId: submission.id,
        name,
        maxMembers: submission.maxGroupSize!,
        createdAt: now,
        updatedAt: now,
      };
    });

    await tx.insert(assignmentGroup).values(rows);

    await createAuditLog({
      actorId: input.meta.actorId,
      action: "submission.group_add",
      entityType: "assignment",
      entityId: submission.id,
      metadata: {
        count: rows.length,
        groupIds: rows.map((row) => row.id),
        names: rows.map((row) => row.name),
      },
      ipAddress: input.meta.ipAddress,
      userAgent: input.meta.userAgent,
    });

    return {
      count: rows.length,
      groups: rows.map((row) => ({ id: row.id, name: row.name })),
    };
  });
}

export async function deleteEmptySubmissionGroup(input: {
  workspaceId: string;
  assignmentId: string;
  groupId: string;
  meta: ActorMeta;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const submission = await lockAssignment(tx, input.assignmentId, input.workspaceId);
    if (submission.status === "CLOSED") {
      throw new ValidationError("Closed submissions cannot be changed");
    }

    const groups = await tx
      .select({ id: assignmentGroup.id })
      .from(assignmentGroup)
      .where(eq(assignmentGroup.assignmentId, submission.id));

    if (groups.length <= 1) {
      throw new ValidationError("Keep at least one group");
    }

    const target = groups.find((group) => group.id === input.groupId);
    if (!target) throw new NotFoundError("Group not found");

    const occupied = await tx
      .select({ value: count() })
      .from(assignmentGroupMember)
      .where(eq(assignmentGroupMember.groupId, target.id));

    if (Number(occupied[0]?.value ?? 0) > 0) {
      throw new ConflictError("Move everyone out before deleting this group");
    }

    await tx.delete(assignmentGroup).where(eq(assignmentGroup.id, target.id));

    await createAuditLog({
      actorId: input.meta.actorId,
      action: "submission.group_delete",
      entityType: "assignment",
      entityId: submission.id,
      metadata: { groupId: target.id },
      ipAddress: input.meta.ipAddress,
      userAgent: input.meta.userAgent,
    });
  });
}

export async function randomizeSubmissionGroups(input: {
  workspaceId: string;
  assignmentId: string;
  meta: ActorMeta;
}): Promise<{ groupCount: number; studentCount: number }> {
  return db.transaction(async (tx) => {
    const submission = await lockAssignment(tx, input.assignmentId, input.workspaceId);
    if (submission.type !== "GROUP" || submission.maxGroupSize == null) {
      throw new ValidationError("This submission does not use groups");
    }
    if (submission.status === "CLOSED") {
      throw new ValidationError("Closed submissions cannot be changed");
    }

    const students = shuffle(await activeStudentIds(tx, input.workspaceId));
    const slots = groupSlotCount(students.length, submission.maxGroupSize);
    const sizes = evenGroupSizes(students.length, slots);

    await tx
      .delete(assignmentGroup)
      .where(eq(assignmentGroup.assignmentId, submission.id));

    let offset = 0;
    const now = new Date();
    for (let index = 0; index < slots; index += 1) {
      const groupId = crypto.randomUUID();
      const size = sizes[index] ?? 0;
      await tx.insert(assignmentGroup).values({
        id: groupId,
        assignmentId: submission.id,
        name: `Group ${index + 1}`,
        maxMembers: submission.maxGroupSize,
        createdAt: now,
        updatedAt: now,
      });

      const slice = students.slice(offset, offset + size);
      offset += size;
      if (slice.length === 0) continue;

      await tx.insert(assignmentGroupMember).values(
        slice.map((userId) => ({
          id: crypto.randomUUID(),
          assignmentId: submission.id,
          groupId,
          userId,
          isLeader: false,
          createdAt: now,
        })),
      );
    }

    if (submission.groupMethod !== "RANDOM") {
      await tx
        .update(assignment)
        .set({ groupMethod: "RANDOM" })
        .where(eq(assignment.id, submission.id));
    }

    await createAuditLog({
      actorId: input.meta.actorId,
      action: "submission.group_random",
      entityType: "assignment",
      entityId: submission.id,
      metadata: { groupCount: slots, studentCount: students.length },
      ipAddress: input.meta.ipAddress,
      userAgent: input.meta.userAgent,
    });

    return { groupCount: slots, studentCount: students.length };
  });
}

export async function moveSubmissionMember(input: {
  workspaceId: string;
  assignmentId: string;
  userId: string;
  toGroupId: string | null;
  actor: "lecturer" | "student";
  meta: ActorMeta;
}): Promise<{ moved: boolean }> {
  try {
    return await db.transaction(async (tx) => {
      const submission = await lockAssignment(
        tx,
        input.assignmentId,
        input.workspaceId,
      );
      if (submission.type !== "GROUP") {
        throw new ValidationError("This submission is individual");
      }
      if (submission.status === "CLOSED") {
        throw new ValidationError("Closed submissions cannot be changed");
      }
      if (input.actor === "student" && submission.status !== "ACTIVE") {
        throw new ForbiddenError(
          "Groups can only be changed while the submission is active",
        );
      }
      if (input.actor === "student" && input.toGroupId == null) {
        throw new ForbiddenError("Choose a group to join");
      }

      const studentRows = await tx
        .select({ id: workspaceMember.id })
        .from(workspaceMember)
        .innerJoin(userTable, eq(userTable.id, workspaceMember.userId))
        .where(
          and(
            eq(workspaceMember.workspaceId, input.workspaceId),
            eq(workspaceMember.userId, input.userId),
            eq(workspaceMember.status, "ACTIVE"),
            eq(userTable.role, "STUDENT"),
            eq(userTable.isActive, true),
            sql`${userTable.deletedAt} is null`,
          ),
        )
        .limit(1);

      if (!studentRows[0]) {
        throw new ValidationError(
          "Only active students in this workspace can join a group",
        );
      }

      const existing = await tx
        .select()
        .from(assignmentGroupMember)
        .where(
          and(
            eq(assignmentGroupMember.assignmentId, submission.id),
            eq(assignmentGroupMember.userId, input.userId),
          ),
        )
        .limit(1);

      if (input.toGroupId == null) {
        if (!existing[0]) return { moved: false };
        await tx
          .delete(assignmentGroupMember)
          .where(eq(assignmentGroupMember.id, existing[0].id));
        await createAuditLog({
          actorId: input.meta.actorId,
          action: "submission.group_move",
          entityType: "assignment",
          entityId: submission.id,
          metadata: { userId: input.userId, toGroupId: null },
          ipAddress: input.meta.ipAddress,
          userAgent: input.meta.userAgent,
        });
        return { moved: true };
      }

      if (existing[0]?.groupId === input.toGroupId) return { moved: false };

      const targets = await tx
        .select()
        .from(assignmentGroup)
        .where(
          and(
            eq(assignmentGroup.id, input.toGroupId),
            eq(assignmentGroup.assignmentId, submission.id),
          ),
        )
        .for("update")
        .limit(1);

      const target = targets[0];
      if (!target) throw new NotFoundError("Group not found");

      const occupied = await tx
        .select({ value: count() })
        .from(assignmentGroupMember)
        .where(eq(assignmentGroupMember.groupId, target.id));

      if (Number(occupied[0]?.value ?? 0) >= target.maxMembers) {
        throw new ConflictError("That group is full");
      }

      if (existing[0]) {
        await tx
          .update(assignmentGroupMember)
          .set({ groupId: target.id })
          .where(eq(assignmentGroupMember.id, existing[0].id));
      } else {
        await tx.insert(assignmentGroupMember).values({
          id: crypto.randomUUID(),
          assignmentId: submission.id,
          groupId: target.id,
          userId: input.userId,
          isLeader: false,
        });
      }

      await createAuditLog({
        actorId: input.meta.actorId,
        action: "submission.group_move",
        entityType: "assignment",
        entityId: submission.id,
        metadata: { userId: input.userId, toGroupId: target.id },
        ipAddress: input.meta.ipAddress,
        userAgent: input.meta.userAgent,
      });

      return { moved: true };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("That student is already assigned to a group");
    }
    throw error;
  }
}

export function isGroupMethod(
  value: string | null,
): value is SubmissionGroupMethod {
  return value === "RANDOM" || value === "SELF_SELECT";
}
