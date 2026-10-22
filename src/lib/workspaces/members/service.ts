import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, isNull, ne, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { loginHistory } from "@/db/schema/login-history";
import { studentProfile } from "@/db/schema/profiles";
import {
  workspace,
  workspaceEmailOutbox,
  workspaceInvitationToken,
  workspaceMember,
} from "@/db/schema/workspaces";
import { createAuditLog } from "@/lib/audit";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/api/errors";
import { resolveDirectoryLabels } from "@/lib/directory/service";
import { enqueueInviteEmail } from "@/lib/queues";
import { toMediaProxyUrl } from "@/lib/workspaces/sanitize-description";
import {
  generateInvitationToken,
  hashInvitationToken,
} from "@/lib/workspaces/import-storage";
import type {
  WorkspaceCandidatePage,
  WorkspaceMemberListPage,
  WorkspaceMemberRecord,
  WorkspaceMemberSource,
} from "@/lib/workspaces/members/types";
import type {
  WorkspaceCandidatesQuery,
  WorkspaceJoinInput,
  WorkspaceMembersAddInput,
  WorkspaceMembersListQuery,
} from "@/lib/workspaces/members/validators";

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
  if (!row || row.deletedAt) throw new NotFoundError("Workspace not found");
  if (row.lecturerId !== lecturerId) {
    throw new ForbiddenError("You do not own this workspace");
  }
  return row;
}

async function resolveMajorLabel(value: string | null): Promise<string | null> {
  if (!value) return null;
  const labels = await resolveDirectoryLabels([{ category: "major", value }]);
  return labels.major ?? value;
}

async function resolveBatchLabel(value: string | null): Promise<string | null> {
  if (!value) return null;
  const labels = await resolveDirectoryLabels([{ category: "batch", value }]);
  return labels.batch ?? value;
}

async function userHasLoggedIn(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: loginHistory.id })
    .from(loginHistory)
    .where(eq(loginHistory.userId, userId))
    .limit(1);
  return rows.length > 0;
}

function mapMemberRow(
  row: typeof workspaceMember.$inferSelect,
  user: typeof userTable.$inferSelect,
  major: string | null,
  majorLabel: string | null,
  batch: string | null,
  batchLabel: string | null,
  hasLoggedIn: boolean,
): WorkspaceMemberRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    status: row.status,
    source: row.source,
    invitedBy: row.invitedBy,
    invitedAt: row.invitedAt?.toISOString() ?? null,
    joinedAt: row.joinedAt?.toISOString() ?? null,
    removedAt: row.removedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      nim: user.nim,
      image: user.image
        ? user.image.startsWith("http") || user.image.startsWith("/")
          ? user.image
          : toMediaProxyUrl(user.image)
        : null,
      major,
      majorLabel,
      batch,
      batchLabel,
      hasLoggedIn,
    },
  };
}

export async function listWorkspaceMembers(input: {
  workspaceId: string;
  lecturerId: string;
  query: WorkspaceMembersListQuery;
}): Promise<WorkspaceMemberListPage> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);

  const conditions: SQL[] = [
    eq(workspaceMember.workspaceId, input.workspaceId),
  ];

  if (input.query.status === "ALL") {
    conditions.push(ne(workspaceMember.status, "REMOVED"));
  } else {
    conditions.push(eq(workspaceMember.status, input.query.status));
  }

  if (input.query.q) {
    const pattern = `%${input.query.q}%`;
    conditions.push(
      or(
        ilike(userTable.name, pattern),
        ilike(userTable.email, pattern),
        ilike(userTable.nim, pattern),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const [totalRow] = await db
    .select({ total: count() })
    .from(workspaceMember)
    .innerJoin(userTable, eq(workspaceMember.userId, userTable.id))
    .where(whereClause);

  const total = totalRow?.total ?? 0;
  const pageSize = input.query.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(input.query.page, totalPages);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      member: workspaceMember,
      user: userTable,
      major: studentProfile.major,
      batch: studentProfile.batch,
    })
    .from(workspaceMember)
    .innerJoin(userTable, eq(workspaceMember.userId, userTable.id))
    .leftJoin(studentProfile, eq(studentProfile.userId, userTable.id))
    .where(whereClause)
    .orderBy(desc(workspaceMember.createdAt), desc(workspaceMember.id))
    .limit(pageSize)
    .offset(offset);

  const loginFlags = await Promise.all(
    rows.map((r) => userHasLoggedIn(r.user.id)),
  );

  const majorLabels = await Promise.all(
    rows.map((r) => resolveMajorLabel(r.major)),
  );
  const batchLabels = await Promise.all(
    rows.map((r) => resolveBatchLabel(r.batch)),
  );

  const items = rows.map((row, index) =>
    mapMemberRow(
      row.member,
      row.user,
      row.major,
      majorLabels[index] ?? null,
      row.batch,
      batchLabels[index] ?? null,
      loginFlags[index] ?? false,
    ),
  );

  return { items, total, page, pageSize, totalPages };
}

export async function searchWorkspaceCandidates(input: {
  workspaceId: string;
  lecturerId: string;
  query: WorkspaceCandidatesQuery;
}): Promise<WorkspaceCandidatePage> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);

  const memberRows = await db
    .select({ userId: workspaceMember.userId })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, input.workspaceId),
        ne(workspaceMember.status, "REMOVED"),
      ),
    );
  const excluded = new Set(memberRows.map((r) => r.userId));

  const conditions: SQL[] = [
    eq(userTable.role, "STUDENT"),
    eq(userTable.isActive, true),
    isNull(userTable.deletedAt),
  ];

  if (input.query.q) {
    const pattern = `%${input.query.q}%`;
    conditions.push(
      or(
        ilike(userTable.name, pattern),
        ilike(userTable.email, pattern),
        ilike(userTable.nim, pattern),
        ilike(userTable.campus, pattern),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const allMatching = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      nim: userTable.nim,
      image: userTable.image,
      major: studentProfile.major,
    })
    .from(userTable)
    .leftJoin(studentProfile, eq(studentProfile.userId, userTable.id))
    .where(whereClause)
    .orderBy(asc(userTable.name))
    .limit(500);

  const filtered = allMatching.filter((u) => !excluded.has(u.id));
  const total = filtered.length;
  const pageSize = input.query.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(input.query.page, totalPages);
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  const labels = await Promise.all(
    slice.map((u) => resolveMajorLabel(u.major)),
  );

  return {
    items: slice.map((u, i) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      nim: u.nim,
      image: u.image
        ? u.image.startsWith("http") || u.image.startsWith("/")
          ? u.image
          : toMediaProxyUrl(u.image)
        : null,
      majorLabel: labels[i] ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function createInvitationOutbox(input: {
  workspaceId: string;
  memberId: string;
  userId: string;
  recipient: string;
  template:
    | "INVITE_EXISTING"
    | "INVITE_REGISTERED_NO_LOGIN"
    | "INVITE_ACTIVATE"
    | "WORKSPACE_JOINED";
  jobId?: string | null;
  activationUrl?: string | null;
  workspaceName: string;
  lecturerName: string;
  className: string;
  semesterLabel: string;
}): Promise<string> {
  const outboxId = crypto.randomUUID();
  await db.insert(workspaceEmailOutbox).values({
    id: outboxId,
    jobId: input.jobId ?? null,
    memberId: input.memberId,
    workspaceId: input.workspaceId,
    recipient: input.recipient,
    template: input.template,
    status: "PENDING",
    attempts: 0,
    payload: {
      workspaceName: input.workspaceName,
      lecturerName: input.lecturerName,
      className: input.className,
      semesterLabel: input.semesterLabel,
      activationUrl: input.activationUrl ?? null,
      recipientName: input.recipient,
    },
  });
  await enqueueInviteEmail({ outboxId });
  return outboxId;
}

export async function issueActivationToken(input: {
  userId: string;
  workspaceId: string;
  memberId: string;
  purpose: "INVITE_EXISTING" | "INVITE_ACTIVATE";
}): Promise<{ token: string; url: string }> {
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db
    .update(workspaceInvitationToken)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(workspaceInvitationToken.userId, input.userId),
        eq(workspaceInvitationToken.workspaceId, input.workspaceId),
        isNull(workspaceInvitationToken.usedAt),
      ),
    );

  await db.insert(workspaceInvitationToken).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    workspaceId: input.workspaceId,
    memberId: input.memberId,
    tokenHash,
    purpose: input.purpose,
    expiresAt,
  });

  const base = process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "";
  const url =
    input.purpose === "INVITE_ACTIVATE"
      ? `${base}/auth/activate?token=${encodeURIComponent(token)}`
      : `${base}/dashboard/student`;

  return { token, url };
}

async function loadLecturerName(lecturerId: string): Promise<string> {
  const rows = await db
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, lecturerId))
    .limit(1);
  return rows[0]?.name ?? "Lecturer";
}

export async function addWorkspaceMembersManual(input: {
  workspaceId: string;
  lecturerId: string;
  data: WorkspaceMembersAddInput;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ added: number; skipped: number }> {
  const ws = await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const uniqueIds = [...new Set(input.data.userIds)];

  const students = await db
    .select()
    .from(userTable)
    .where(
      and(
        inArray(userTable.id, uniqueIds),
        eq(userTable.role, "STUDENT"),
        eq(userTable.isActive, true),
        isNull(userTable.deletedAt),
      ),
    );

  if (students.length === 0) {
    throw new ValidationError("No valid students selected");
  }

  const existing = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, input.workspaceId),
        inArray(
          workspaceMember.userId,
          students.map((s) => s.id),
        ),
      ),
    );
  const existingByUser = new Map(existing.map((m) => [m.userId, m]));

  const semesterLabels = await resolveDirectoryLabels([
    { category: "semester", value: ws.semester },
  ]);
  const lecturerName = await loadLecturerName(input.lecturerId);

  let added = 0;
  let skipped = 0;

  for (const student of students) {
    const current = existingByUser.get(student.id);
    if (current && current.status !== "REMOVED") {
      skipped += 1;
      continue;
    }

    const hasLogin = await userHasLoggedIn(student.id);
    const now = new Date();
    let memberId: string;

    if (current && current.status === "REMOVED") {
      memberId = current.id;
      await db
        .update(workspaceMember)
        .set({
          status: "INVITED",
          source: "MANUAL",
          invitedBy: input.lecturerId,
          invitedAt: now,
          removedAt: null,
          joinedAt: null,
        })
        .where(eq(workspaceMember.id, memberId));
    } else {
      memberId = crypto.randomUUID();
      await db.insert(workspaceMember).values({
        id: memberId,
        workspaceId: input.workspaceId,
        userId: student.id,
        status: "INVITED",
        source: "MANUAL",
        invitedBy: input.lecturerId,
        invitedAt: now,
      });
    }

    const template = hasLogin
      ? "INVITE_EXISTING"
      : "INVITE_REGISTERED_NO_LOGIN";

    let activationUrl: string | null = null;
    if (!hasLogin) {
      const base = process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "";
      activationUrl = `${base}/auth/forgot-password`;
    } else {
      const base = process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "";
      activationUrl = `${base}/dashboard/student`;
    }

    await createInvitationOutbox({
      workspaceId: input.workspaceId,
      memberId,
      userId: student.id,
      recipient: student.email,
      template,
      workspaceName: ws.name,
      lecturerName,
      className: ws.className,
      semesterLabel: semesterLabels.semester ?? ws.semester,
      activationUrl,
    });

    added += 1;
  }

  await createAuditLog({
    actorId: input.lecturerId,
    action: "workspace_member.add",
    entityType: "workspace",
    entityId: input.workspaceId,
    metadata: { added, skipped, source: "MANUAL" },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return { added, skipped };
}

export async function removeWorkspaceMember(input: {
  workspaceId: string;
  lecturerId: string;
  memberId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);

  const rows = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.id, input.memberId),
        eq(workspaceMember.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);

  const member = rows[0];
  if (!member) throw new NotFoundError("Member not found");
  if (member.status === "REMOVED") return;

  await db
    .update(workspaceMember)
    .set({
      status: "REMOVED",
      removedAt: new Date(),
    })
    .where(eq(workspaceMember.id, member.id));

  await createAuditLog({
    actorId: input.lecturerId,
    action: "workspace_member.remove",
    entityType: "workspace",
    entityId: input.workspaceId,
    metadata: { memberId: member.id, userId: member.userId },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}

export async function joinWorkspaceByCode(input: {
  studentId: string;
  data: WorkspaceJoinInput;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ workspaceId: string; alreadyMember: boolean }> {
  const code = input.data.code.trim().toLowerCase();
  const rows = await db
    .select()
    .from(workspace)
    .where(eq(workspace.inviteCode, code))
    .limit(1);

  const ws = rows[0];
  if (!ws || ws.deletedAt) throw new NotFoundError("Invalid invite code");
  if (ws.status !== "ACTIVE") {
    throw new ForbiddenError(
      ws.status === "DRAFT"
        ? "This workspace is still a draft and is not open to students yet."
        : "This workspace is inactive and cannot be accessed by students.",
    );
  }

  const studentRows = await db
    .select()
    .from(userTable)
    .where(
      and(
        eq(userTable.id, input.studentId),
        eq(userTable.role, "STUDENT"),
        eq(userTable.isActive, true),
        isNull(userTable.deletedAt),
      ),
    )
    .limit(1);

  const student = studentRows[0];
  if (!student) {
    throw new ForbiddenError("Only active students can join a workspace");
  }

  const existing = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, ws.id),
        eq(workspaceMember.userId, input.studentId),
      ),
    )
    .limit(1);

  const source: WorkspaceMemberSource = input.data.source;
  const now = new Date();
  let memberId = existing[0]?.id ?? null;
  let alreadyMember = false;
  let shouldNotify = false;

  if (existing[0] && existing[0].status !== "REMOVED") {
    if (existing[0].status === "INVITED") {
      await db
        .update(workspaceMember)
        .set({
          status: "ACTIVE",
          joinedAt: now,
          source,
        })
        .where(eq(workspaceMember.id, existing[0].id));
      shouldNotify = true;
    } else {
      alreadyMember = true;
    }
    memberId = existing[0].id;
  } else if (existing[0]?.status === "REMOVED") {
    await db
      .update(workspaceMember)
      .set({
        status: "ACTIVE",
        source,
        joinedAt: now,
        removedAt: null,
        invitedAt: now,
      })
      .where(eq(workspaceMember.id, existing[0].id));
    memberId = existing[0].id;
    shouldNotify = true;
  } else {
    memberId = crypto.randomUUID();
    await db.insert(workspaceMember).values({
      id: memberId,
      workspaceId: ws.id,
      userId: input.studentId,
      status: "ACTIVE",
      source,
      invitedAt: now,
      joinedAt: now,
    });
    shouldNotify = true;
  }

  if (shouldNotify && memberId) {
    const lecturerName = await loadLecturerName(ws.lecturerId);
    const semesterLabels = await resolveDirectoryLabels([
      { category: "semester", value: ws.semester },
    ]);
    try {
      const appUrl =
        process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
        "";
      await createInvitationOutbox({
        workspaceId: ws.id,
        memberId,
        userId: student.id,
        recipient: student.email,
        template: "WORKSPACE_JOINED",
        workspaceName: ws.name,
        lecturerName,
        className: ws.className,
        semesterLabel: semesterLabels.semester ?? ws.semester,
        activationUrl: appUrl
          ? `${appUrl}/dashboard/student/workspaces/${ws.id}`
          : null,
      });
    } catch {
      // Join must succeed even if email queueing fails.
    }
  }

  await createAuditLog({
    actorId: input.studentId,
    action: "workspace_member.join",
    entityType: "workspace",
    entityId: ws.id,
    metadata: { source, notified: shouldNotify },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return { workspaceId: ws.id, alreadyMember };
}

export { loadOwnedWorkspace, userHasLoggedIn, loadLecturerName };
