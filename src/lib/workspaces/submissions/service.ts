import "server-only";

import { and, asc, count, desc, eq, ilike, inArray } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import {
  assignment,
  assignmentGroup,
  assignmentGroupMember,
} from "@/db/schema/workspaces";
import { createAuditLog } from "@/lib/audit";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { toMediaProxyUrl } from "@/lib/workspaces/sanitize-description";
import { loadOwnedWorkspace } from "@/lib/workspaces/submissions/access";
import {
  ensureEmptyGroups,
  isGroupMethod,
} from "@/lib/workspaces/submissions/groups";
import { sanitizeSubmissionDescription } from "@/lib/workspaces/submissions/sanitize";
import {
  submissionWindowState,
  type SubmissionCurrentCard,
  type SubmissionGroupCard,
  type SubmissionListPage,
  type SubmissionPrepareState,
  type SubmissionRecord,
  type SubmissionStatus,
} from "@/lib/workspaces/submissions/types";
import type {
  StudentSubmissionListQuery,
  SubmissionListQuery,
  SubmissionWriteInput,
} from "@/lib/workspaces/submissions/validators";

type ActorMeta = {
  actorId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

function toRecord(row: typeof assignment.$inferSelect): SubmissionRecord {
  const groupMethod = isGroupMethod(row.groupMethod)
    ? row.groupMethod
    : row.groupMethod === "MANUAL"
      ? "SELF_SELECT"
      : null;

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    description: row.description,
    type: row.type,
    groupMethod,
    maxGroupSize: row.maxGroupSize,
    maxScore: row.maxScore,
    scheduleMode: row.scheduleMode,
    opensAt: row.opensAt?.toISOString() ?? null,
    closesAt: row.closesAt?.toISOString() ?? null,
    status: row.status,
    windowState: submissionWindowState({
      scheduleMode: row.scheduleMode,
      opensAt: row.opensAt,
      closesAt: row.closesAt,
    }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function scheduleColumns(input: SubmissionWriteInput): {
  scheduleMode: "OPEN" | "WINDOW";
  opensAt: Date | null;
  closesAt: Date | null;
} {
  if (input.scheduleMode === "OPEN") {
    return { scheduleMode: "OPEN", opensAt: null, closesAt: null };
  }
  return {
    scheduleMode: "WINDOW",
    opensAt: new Date(input.opensAt!),
    closesAt: new Date(input.closesAt!),
  };
}

function listOrder(
  sortBy: "updatedAt" | "title" | "opensAt" | "maxScore" | "status",
  sortDir: "asc" | "desc",
) {
  const direction = sortDir === "asc" ? asc : desc;
  const tie = desc(assignment.updatedAt);
  switch (sortBy) {
    case "title":
      return [direction(assignment.title), tie] as const;
    case "opensAt":
      return [direction(assignment.opensAt), tie] as const;
    case "maxScore":
      return [direction(assignment.maxScore), tie] as const;
    case "status":
      return [direction(assignment.status), tie] as const;
    default:
      return [direction(assignment.updatedAt)] as const;
  }
}

function searchFilter(q: string) {
  const safe = q.trim().replace(/[%_]/g, "");
  if (!safe) return undefined;
  return ilike(assignment.title, `%${safe}%`);
}

async function loadSubmission(workspaceId: string, assignmentId: string) {
  const rows = await db
    .select()
    .from(assignment)
    .where(
      and(eq(assignment.id, assignmentId), eq(assignment.workspaceId, workspaceId)),
    )
    .limit(1);
  const row = rows[0];
  if (!row) throw new NotFoundError("Submission not found");
  return row;
}

async function assertGroupSizeFits(
  assignmentId: string,
  maxGroupSize: number,
): Promise<void> {
  const rows = await db
    .select({
      groupId: assignmentGroupMember.groupId,
      value: count(),
    })
    .from(assignmentGroupMember)
    .where(eq(assignmentGroupMember.assignmentId, assignmentId))
    .groupBy(assignmentGroupMember.groupId);

  const overflow = rows.find((row) => Number(row.value) > maxGroupSize);
  if (overflow) {
    throw new ValidationError(
      "A group already has more members than that maximum. Move people out first.",
    );
  }
}

export async function listLecturerSubmissions(input: {
  workspaceId: string;
  lecturerId: string;
  query: SubmissionListQuery;
}): Promise<SubmissionListPage> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);

  const filters = [eq(assignment.workspaceId, input.workspaceId)];
  if (input.query.status !== "ALL") {
    filters.push(eq(assignment.status, input.query.status));
  }
  if (input.query.type !== "ALL") {
    filters.push(eq(assignment.type, input.query.type));
  }
  const title = searchFilter(input.query.q);
  if (title) filters.push(title);

  const where = and(...filters);
  const totalRows = await db.select({ value: count() }).from(assignment).where(where);
  const total = Number(totalRows[0]?.value ?? 0);
  const offset = (input.query.page - 1) * input.query.pageSize;

  const rows = await db
    .select()
    .from(assignment)
    .where(where)
    .orderBy(...listOrder(input.query.sortBy, input.query.sortDir))
    .limit(input.query.pageSize)
    .offset(offset);

  return {
    items: rows.map(toRecord),
    total,
    page: input.query.page,
    pageSize: input.query.pageSize,
    totalPages: totalPages(total, input.query.pageSize),
  };
}

export async function listStudentSubmissions(input: {
  workspaceId: string;
  query: StudentSubmissionListQuery;
}): Promise<SubmissionListPage> {
  const filters = [
    eq(assignment.workspaceId, input.workspaceId),
    inArray(assignment.status, ["ACTIVE", "CLOSED"]),
  ];
  if (input.query.status !== "ALL") {
    filters.push(eq(assignment.status, input.query.status));
  }
  if (input.query.type !== "ALL") {
    filters.push(eq(assignment.type, input.query.type));
  }
  const title = searchFilter(input.query.q);
  if (title) filters.push(title);

  const where = and(...filters);
  const totalRows = await db.select({ value: count() }).from(assignment).where(where);
  const total = Number(totalRows[0]?.value ?? 0);
  const offset = (input.query.page - 1) * input.query.pageSize;

  const rows = await db
    .select()
    .from(assignment)
    .where(where)
    .orderBy(...listOrder(input.query.sortBy, input.query.sortDir))
    .limit(input.query.pageSize)
    .offset(offset);

  return {
    items: rows.map(toRecord),
    total,
    page: input.query.page,
    pageSize: input.query.pageSize,
    totalPages: totalPages(total, input.query.pageSize),
  };
}

export async function getCurrentSubmission(input: {
  workspaceId: string;
}): Promise<SubmissionCurrentCard> {
  const rows = await db
    .select()
    .from(assignment)
    .where(
      and(
        eq(assignment.workspaceId, input.workspaceId),
        eq(assignment.status, "ACTIVE"),
      ),
    );

  if (rows.length === 0) {
    return { submission: null, activeCount: 0 };
  }

  const now = new Date();
  const ranked = [...rows].sort((left, right) => rank(left, now) - rank(right, now) || right.updatedAt.getTime() - left.updatedAt.getTime());
  const current = ranked[0];
  if (!current) return { submission: null, activeCount: rows.length };

  return {
    submission: toRecord(current),
    activeCount: rows.length,
  };
}

function rank(row: typeof assignment.$inferSelect, now: Date): number {
  if (
    row.scheduleMode === "WINDOW" &&
    row.opensAt &&
    row.closesAt &&
    row.opensAt <= now &&
    row.closesAt >= now
  ) {
    return row.closesAt.getTime();
  }
  if (row.scheduleMode === "WINDOW" && row.opensAt && row.opensAt > now) {
    return 1_000_000_000_000_000 + row.opensAt.getTime();
  }
  if (row.scheduleMode === "OPEN") {
    return 2_000_000_000_000_000 - row.updatedAt.getTime();
  }
  return 3_000_000_000_000_000 - row.updatedAt.getTime();
}

export async function getLecturerSubmission(input: {
  workspaceId: string;
  lecturerId: string;
  assignmentId: string;
}): Promise<SubmissionRecord> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  return toRecord(await loadSubmission(input.workspaceId, input.assignmentId));
}

export async function getStudentSubmission(input: {
  workspaceId: string;
  assignmentId: string;
}): Promise<SubmissionRecord> {
  const row = await loadSubmission(input.workspaceId, input.assignmentId);
  if (row.status === "DRAFT") throw new NotFoundError("Submission not found");
  return toRecord(row);
}

export async function createLecturerSubmission(input: {
  workspaceId: string;
  lecturerId: string;
  data: SubmissionWriteInput;
  meta: ActorMeta;
}): Promise<SubmissionRecord> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const description = sanitizeSubmissionDescription(input.data.description);
  const schedule = scheduleColumns(input.data);
  const id = crypto.randomUUID();
  const isGroup = input.data.type === "GROUP";

  await db.transaction(async (tx) => {
    await tx.insert(assignment).values({
      id,
      workspaceId: input.workspaceId,
      title: input.data.title,
      description,
      type: input.data.type,
      groupMethod: isGroup ? input.data.groupMethod! : null,
      maxGroupSize: isGroup ? input.data.maxGroupSize! : null,
      maxScore: input.data.maxScore,
      ...schedule,
      status: input.data.status,
      isPublished: input.data.status === "ACTIVE",
      sortOrder: 0,
    });

    if (isGroup && input.data.maxGroupSize) {
      await ensureEmptyGroups(tx, {
        assignmentId: id,
        workspaceId: input.workspaceId,
        maxGroupSize: input.data.maxGroupSize,
      });
    }
  });

  await createAuditLog({
    actorId: input.meta.actorId,
    action: "submission.create",
    entityType: "assignment",
    entityId: id,
    metadata: {
      workspaceId: input.workspaceId,
      type: input.data.type,
      status: input.data.status,
    },
    ipAddress: input.meta.ipAddress,
    userAgent: input.meta.userAgent,
  });

  return toRecord(await loadSubmission(input.workspaceId, id));
}

export async function updateLecturerSubmission(input: {
  workspaceId: string;
  lecturerId: string;
  assignmentId: string;
  data: SubmissionWriteInput;
  meta: ActorMeta;
}): Promise<SubmissionRecord> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const current = await loadSubmission(input.workspaceId, input.assignmentId);
  if (current.status === "CLOSED") {
    throw new ValidationError("Closed submissions cannot be edited");
  }

  const description = sanitizeSubmissionDescription(input.data.description);
  const schedule = scheduleColumns(input.data);
  const nextGroup = input.data.type === "GROUP";

  if (current.type === "GROUP" && !nextGroup) {
    const members = await db
      .select({ value: count() })
      .from(assignmentGroupMember)
      .where(eq(assignmentGroupMember.assignmentId, current.id));
    if (Number(members[0]?.value ?? 0) > 0) {
      throw new ValidationError(
        "Move everyone out of groups before switching this submission to individual",
      );
    }
  }

  if (nextGroup && input.data.maxGroupSize) {
    await assertGroupSizeFits(current.id, input.data.maxGroupSize);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(assignment)
      .set({
        title: input.data.title,
        description,
        type: input.data.type,
        groupMethod: nextGroup ? input.data.groupMethod! : null,
        maxGroupSize: nextGroup ? input.data.maxGroupSize! : null,
        maxScore: input.data.maxScore,
        ...schedule,
        status: input.data.status,
        isPublished: input.data.status === "ACTIVE",
      })
      .where(eq(assignment.id, current.id));

    if (!nextGroup) {
      await tx
        .delete(assignmentGroup)
        .where(eq(assignmentGroup.assignmentId, current.id));
    } else if (input.data.maxGroupSize) {
      await tx
        .update(assignmentGroup)
        .set({ maxMembers: input.data.maxGroupSize })
        .where(eq(assignmentGroup.assignmentId, current.id));
      await ensureEmptyGroups(tx, {
        assignmentId: current.id,
        workspaceId: input.workspaceId,
        maxGroupSize: input.data.maxGroupSize,
      });
    }
  });

  await createAuditLog({
    actorId: input.meta.actorId,
    action: "submission.update",
    entityType: "assignment",
    entityId: current.id,
    metadata: {
      workspaceId: input.workspaceId,
      status: input.data.status,
      previousStatus: current.status,
    },
    ipAddress: input.meta.ipAddress,
    userAgent: input.meta.userAgent,
  });

  return toRecord(await loadSubmission(input.workspaceId, current.id));
}

export async function deleteLecturerSubmission(input: {
  workspaceId: string;
  lecturerId: string;
  assignmentId: string;
  meta: ActorMeta;
}): Promise<void> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const current = await loadSubmission(input.workspaceId, input.assignmentId);
  await db.delete(assignment).where(eq(assignment.id, current.id));
  await createAuditLog({
    actorId: input.meta.actorId,
    action: "submission.delete",
    entityType: "assignment",
    entityId: current.id,
    metadata: { workspaceId: input.workspaceId, title: current.title },
    ipAddress: input.meta.ipAddress,
    userAgent: input.meta.userAgent,
  });
}

async function setStatus(input: {
  workspaceId: string;
  lecturerId: string;
  assignmentId: string;
  status: SubmissionStatus;
  from: SubmissionStatus;
  action: string;
  meta: ActorMeta;
}): Promise<SubmissionRecord> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const current = await loadSubmission(input.workspaceId, input.assignmentId);
  if (current.status !== input.from) {
    throw new ValidationError(
      input.status === "ACTIVE"
        ? "Only a draft submission can be published"
        : "Only an active submission can be closed",
    );
  }

  await db
    .update(assignment)
    .set({
      status: input.status,
      isPublished: input.status !== "DRAFT",
    })
    .where(eq(assignment.id, current.id));

  await createAuditLog({
    actorId: input.meta.actorId,
    action: input.action,
    entityType: "assignment",
    entityId: current.id,
    metadata: { workspaceId: input.workspaceId },
    ipAddress: input.meta.ipAddress,
    userAgent: input.meta.userAgent,
  });

  return toRecord(await loadSubmission(input.workspaceId, current.id));
}

export function publishLecturerSubmission(input: {
  workspaceId: string;
  lecturerId: string;
  assignmentId: string;
  meta: ActorMeta;
}) {
  return setStatus({
    ...input,
    status: "ACTIVE",
    from: "DRAFT",
    action: "submission.publish",
  });
}

export function closeLecturerSubmission(input: {
  workspaceId: string;
  lecturerId: string;
  assignmentId: string;
  meta: ActorMeta;
}) {
  return setStatus({
    ...input,
    status: "CLOSED",
    from: "ACTIVE",
    action: "submission.close",
  });
}

export async function getSubmissionPrepareState(input: {
  workspaceId: string;
  assignmentId: string;
  studentId: string;
}): Promise<SubmissionPrepareState> {
  const row = await loadSubmission(input.workspaceId, input.assignmentId);
  if (row.status === "DRAFT") throw new NotFoundError("Submission not found");
  const record = toRecord(row);

  if (record.type === "INDIVIDUAL") {
    const closed = record.status === "CLOSED" || record.windowState === "ENDED";
    const upcoming = record.windowState === "UPCOMING";
    return {
      canPrepare: true,
      canSubmitLater: record.status === "ACTIVE" && !closed && !upcoming,
      blockedReason: prepareBlockReason({
        status: record.status,
        windowState: record.windowState,
        memberCount: 1,
        type: "INDIVIDUAL",
      }),
      myGroup: null,
    };
  }

  const membership = await db
    .select({
      groupId: assignmentGroup.id,
      name: assignmentGroup.name,
      maxMembers: assignmentGroup.maxMembers,
    })
    .from(assignmentGroupMember)
    .innerJoin(
      assignmentGroup,
      eq(assignmentGroup.id, assignmentGroupMember.groupId),
    )
    .where(
      and(
        eq(assignmentGroupMember.assignmentId, row.id),
        eq(assignmentGroupMember.userId, input.studentId),
      ),
    )
    .limit(1);

  const mine = membership[0];
  if (!mine) {
    return {
      canPrepare: false,
      canSubmitLater: false,
      blockedReason: "Join a group before preparing this project.",
      myGroup: null,
    };
  }

  const people = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      nim: userTable.nim,
      image: userTable.image,
    })
    .from(assignmentGroupMember)
    .innerJoin(userTable, eq(userTable.id, assignmentGroupMember.userId))
    .where(eq(assignmentGroupMember.groupId, mine.groupId));

  const memberCount = people.length;
  const myGroup: SubmissionGroupCard = {
    id: mine.groupId,
    name: mine.name,
    maxMembers: mine.maxMembers,
    memberCount,
    members: people.map((person) => ({
      userId: person.id,
      name: person.name,
      email: person.email,
      nim: person.nim,
      image: person.image
        ? person.image.startsWith("http") || person.image.startsWith("/")
          ? person.image
          : toMediaProxyUrl(person.image)
        : null,
    })),
  };

  return {
    canPrepare: true,
    canSubmitLater:
      record.status === "ACTIVE" &&
      record.windowState !== "ENDED" &&
      record.windowState !== "UPCOMING" &&
      memberCount >= 2,
    blockedReason: prepareBlockReason({
      status: record.status,
      windowState: record.windowState,
      memberCount,
      type: "GROUP",
    }),
    myGroup,
  };
}

function prepareBlockReason(input: {
  status: SubmissionStatus;
  windowState: SubmissionRecord["windowState"];
  memberCount: number;
  type: SubmissionRecord["type"];
}): string | null {
  if (input.status === "CLOSED") return "This submission is closed.";
  if (input.windowState === "UPCOMING") {
    return "The submission window has not opened yet.";
  }
  if (input.windowState === "ENDED") return "The submission window has ended.";
  if (input.type === "GROUP" && input.memberCount < 2) {
    return "A group needs at least 2 members before the project can be submitted. You can still prepare it.";
  }
  return "Project submit is coming soon.";
}

export async function getLecturerCurrentSubmission(input: {
  workspaceId: string;
  lecturerId: string;
}): Promise<SubmissionCurrentCard> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  return getCurrentSubmission({ workspaceId: input.workspaceId });
}
