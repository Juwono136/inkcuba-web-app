import "server-only";

import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { lecturerProfile, studentProfile } from "@/db/schema/profiles";
import { workspace, workspaceMember } from "@/db/schema/workspaces";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { resolveDirectoryLabels } from "@/lib/directory/service";
import { resolveUserImageUrl } from "@/lib/media/resolve-avatar-url";
import {
  resolveMediaUrl,
  rewriteStorageUrlsInHtml,
} from "@/lib/media/resolve-media-url";
import {
  assertStudentCanAccessWorkspace,
  assertStudentCanAccessWorkspaceByInviteCode,
} from "@/lib/workspaces/service";
import type {
  WorkspaceMemberListPage,
  WorkspaceMemberRecord,
} from "@/lib/workspaces/members/types";
import type { WorkspaceMembersListQuery } from "@/lib/workspaces/members/validators";
import { toMediaProxyUrl } from "@/lib/workspaces/sanitize-description";
import type { WorkspaceStatus } from "@/lib/workspaces/types";

function resolveWorkspaceBackgroundUrl(
  key: string | null | undefined,
  fallbackUrl: string | null | undefined,
): string | null {
  if (key?.trim()) {
    return toMediaProxyUrl(key.trim());
  }
  return resolveMediaUrl(fallbackUrl);
}

export type WorkspaceInvitePreview = {
  name: string;
  className: string;
  semesterLabel: string;
  lecturerName: string;
  status: WorkspaceStatus;
};

export type StudentWorkspaceListItem = {
  id: string;
  name: string;
  className: string;
  semester: string;
  semesterLabel: string;
  backgroundImageUrl: string | null;
  status: WorkspaceStatus;
  lecturerName: string;
  memberStatus: "INVITED" | "ACTIVE";
  joinedAt: string | null;
  updatedAt: string;
};

export type StudentWorkspaceListFacets = {
  /** Distinct semester values from the student's joined workspaces. */
  semesters: Array<{ value: string; label: string }>;
  /** Distinct class names from the student's joined workspaces. */
  classNames: string[];
};

export type StudentWorkspaceListPage = {
  items: StudentWorkspaceListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: StudentWorkspaceListFacets;
};

export type StudentWorkspaceDetail = StudentWorkspaceListItem & {
  description: string | null;
  lecturer: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    title: string | null;
    nim: string | null;
    binusianId: string | null;
    campus: string | null;
    campusLabel: string | null;
    major: string | null;
    majorLabel: string | null;
    department: string | null;
    departmentLabel: string | null;
  };
  memberCount: number;
};

async function resolveSemesterLabel(value: string): Promise<string> {
  const labels = await resolveDirectoryLabels([
    { category: "semester", value },
  ]);
  return labels.semester ?? value;
}

/** Public-safe preview for the join gate (Active workspaces only). */
export async function getWorkspaceInvitePreview(
  inviteCode: string,
): Promise<WorkspaceInvitePreview | null> {
  try {
    const row = await assertStudentCanAccessWorkspaceByInviteCode(inviteCode);
    const lecturerRows = await db
      .select({ name: userTable.name })
      .from(userTable)
      .where(eq(userTable.id, row.lecturerId))
      .limit(1);
    return {
      name: row.name,
      className: row.className,
      semesterLabel: await resolveSemesterLabel(row.semester),
      lecturerName: lecturerRows[0]?.name ?? "Lecturer",
      status: row.status,
    };
  } catch {
    return null;
  }
}

export async function listStudentWorkspaces(input: {
  studentId: string;
  page?: number;
  pageSize?: number;
  q?: string;
  /** Exact semester directory value. */
  semester?: string;
  /** Exact class name. */
  className?: string;
}): Promise<StudentWorkspaceListPage> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, input.pageSize ?? 12));
  const q = input.q?.trim() ?? "";
  const semesterFilter = input.semester?.trim() ?? "";
  const classFilter = input.className?.trim() ?? "";

  const membershipConditions = [
    eq(workspaceMember.userId, input.studentId),
    inArray(workspaceMember.status, ["ACTIVE", "INVITED"]),
    eq(workspace.status, "ACTIVE"),
    isNull(workspace.deletedAt),
  ];

  const conditions = [...membershipConditions];

  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(workspace.name, pattern),
        ilike(workspace.className, pattern),
        ilike(userTable.name, pattern),
      )!,
    );
  }

  if (semesterFilter) {
    conditions.push(eq(workspace.semester, semesterFilter));
  }

  if (classFilter) {
    conditions.push(eq(workspace.className, classFilter));
  }

  const whereClause = and(...conditions);
  const membershipWhere = and(...membershipConditions);

  const [totalRow, facetRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(workspaceMember)
      .innerJoin(workspace, eq(workspace.id, workspaceMember.workspaceId))
      .innerJoin(userTable, eq(userTable.id, workspace.lecturerId))
      .where(whereClause)
      .then((rows) => rows[0]),
    db
      .select({
        semester: workspace.semester,
        className: workspace.className,
      })
      .from(workspaceMember)
      .innerJoin(workspace, eq(workspace.id, workspaceMember.workspaceId))
      .where(membershipWhere)
      .limit(2000),
  ]);

  const total = totalRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const rows = await db
    .select({
      id: workspace.id,
      name: workspace.name,
      className: workspace.className,
      semester: workspace.semester,
      backgroundImageKey: workspace.backgroundImageKey,
      backgroundImageUrl: workspace.backgroundImageUrl,
      status: workspace.status,
      updatedAt: workspace.updatedAt,
      memberStatus: workspaceMember.status,
      joinedAt: workspaceMember.joinedAt,
      lecturerName: userTable.name,
    })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspace.id, workspaceMember.workspaceId))
    .innerJoin(userTable, eq(userTable.id, workspace.lecturerId))
    .where(whereClause)
    .orderBy(desc(workspace.updatedAt))
    .limit(pageSize)
    .offset(offset);

  const pageSemesters = [...new Set(rows.map((r) => r.semester))];
  const facetSemesterValues = [
    ...new Set(facetRows.map((r) => r.semester).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
  const facetClassNames = [
    ...new Set(facetRows.map((r) => r.className.trim()).filter(Boolean)),
  ]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 200);

  const labelsNeeded = [
    ...new Set([...pageSemesters, ...facetSemesterValues]),
  ];
  const semesterLabelEntries = await Promise.all(
    labelsNeeded.map(
      async (value) => [value, await resolveSemesterLabel(value)] as const,
    ),
  );
  const semesterLabels = new Map(semesterLabelEntries);

  const items: StudentWorkspaceListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    className: row.className,
    semester: row.semester,
    semesterLabel: semesterLabels.get(row.semester) ?? row.semester,
    backgroundImageUrl: resolveWorkspaceBackgroundUrl(
      row.backgroundImageKey,
      row.backgroundImageUrl,
    ),
    status: row.status as WorkspaceStatus,
    lecturerName: row.lecturerName,
    memberStatus: row.memberStatus as "INVITED" | "ACTIVE",
    joinedAt: row.joinedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }));

  const facets: StudentWorkspaceListFacets = {
    semesters: facetSemesterValues.map((value) => ({
      value,
      label: semesterLabels.get(value) ?? value,
    })),
    classNames: facetClassNames,
  };

  return { items, total, page: safePage, pageSize, totalPages, facets };
}

export async function getStudentWorkspaceDetail(input: {
  studentId: string;
  workspaceId: string;
}): Promise<StudentWorkspaceDetail> {
  const ws = await assertStudentCanAccessWorkspace(input.workspaceId);

  const memberRows = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, input.workspaceId),
        eq(workspaceMember.userId, input.studentId),
        inArray(workspaceMember.status, ["ACTIVE", "INVITED"]),
      ),
    )
    .limit(1);

  const member = memberRows[0];
  if (!member) {
    throw new ForbiddenError("You are not a member of this workspace");
  }

  if (member.status === "INVITED") {
    await db
      .update(workspaceMember)
      .set({
        status: "ACTIVE",
        joinedAt: member.joinedAt ?? new Date(),
      })
      .where(eq(workspaceMember.id, member.id));
  }

  const lecturerRows = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
      nim: userTable.nim,
      campus: userTable.campus,
    })
    .from(userTable)
    .where(eq(userTable.id, ws.lecturerId))
    .limit(1);

  const lecturer = lecturerRows[0];
  if (!lecturer) throw new NotFoundError("Lecturer not found");

  const profileRows = await db
    .select({
      title: lecturerProfile.title,
      major: lecturerProfile.major,
      department: lecturerProfile.department,
    })
    .from(lecturerProfile)
    .where(eq(lecturerProfile.userId, ws.lecturerId))
    .limit(1);

  const profile = profileRows[0];
  const campus = lecturer.campus?.trim() || null;
  const major = profile?.major?.trim() || null;
  const department = profile?.department?.trim() || null;
  const labels = await resolveDirectoryLabels([
    { category: "campus", value: campus },
    { category: "major", value: major },
    { category: "department", value: department },
  ]);

  const [memberCountRow] = await db
    .select({ total: count() })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, input.workspaceId),
        ne(workspaceMember.status, "REMOVED"),
      ),
    );

  const binusianId = lecturer.nim?.trim() || null;

  return {
    id: ws.id,
    name: ws.name,
    className: ws.className,
    semester: ws.semester,
    semesterLabel: await resolveSemesterLabel(ws.semester),
    backgroundImageUrl: resolveWorkspaceBackgroundUrl(
      ws.backgroundImageKey,
      ws.backgroundImageUrl,
    ),
    status: ws.status,
    lecturerName: lecturer.name,
    memberStatus: "ACTIVE",
    joinedAt: (member.joinedAt ?? new Date()).toISOString(),
    updatedAt: ws.updatedAt.toISOString(),
    description: rewriteStorageUrlsInHtml(ws.description),
    memberCount: memberCountRow?.total ?? 0,
    lecturer: {
      id: lecturer.id,
      name: lecturer.name,
      email: lecturer.email,
      image: resolveUserImageUrl(lecturer.image),
      title: profile?.title?.trim() || null,
      nim: binusianId,
      binusianId,
      campus,
      campusLabel: labels.campus,
      major,
      majorLabel: labels.major,
      department,
      departmentLabel: labels.department,
    },
  };
}

async function resolveMajorLabel(value: string | null): Promise<string | null> {
  if (!value?.trim()) return null;
  const labels = await resolveDirectoryLabels([
    { category: "major", value },
  ]);
  return labels.major;
}

async function resolveBatchLabel(value: string | null): Promise<string | null> {
  if (!value?.trim()) return null;
  const labels = await resolveDirectoryLabels([
    { category: "batch", value },
  ]);
  return labels.batch;
}

function mapStudentVisibleMember(
  row: typeof workspaceMember.$inferSelect,
  user: typeof userTable.$inferSelect,
  major: string | null,
  majorLabel: string | null,
  batch: string | null,
  batchLabel: string | null,
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
      hasLoggedIn: true,
    },
  };
}

/**
 * Read-only people list for enrolled students (no invite/add/remove).
 */
export async function listStudentWorkspacePeople(input: {
  studentId: string;
  workspaceId: string;
  query: WorkspaceMembersListQuery;
}): Promise<WorkspaceMemberListPage> {
  await assertStudentCanAccessWorkspace(input.workspaceId);

  const membership = await db
    .select({ id: workspaceMember.id })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, input.workspaceId),
        eq(workspaceMember.userId, input.studentId),
        inArray(workspaceMember.status, ["ACTIVE", "INVITED"]),
      ),
    )
    .limit(1);

  if (!membership[0]) {
    throw new ForbiddenError("You are not a member of this workspace");
  }

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

  const majorLabels = await Promise.all(
    rows.map((r) => resolveMajorLabel(r.major)),
  );
  const batchLabels = await Promise.all(
    rows.map((r) => resolveBatchLabel(r.batch)),
  );

  const items = rows.map((row, index) =>
    mapStudentVisibleMember(
      row.member,
      row.user,
      row.major,
      majorLabels[index] ?? null,
      row.batch,
      batchLabels[index] ?? null,
    ),
  );

  return { items, total, page, pageSize, totalPages };
}
