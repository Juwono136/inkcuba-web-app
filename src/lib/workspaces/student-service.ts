import "server-only";

import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { lecturerProfile } from "@/db/schema/profiles";
import { workspace, workspaceMember } from "@/db/schema/workspaces";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { resolveDirectoryLabels } from "@/lib/directory/service";
import {
  assertStudentCanAccessWorkspace,
  assertStudentCanAccessWorkspaceByInviteCode,
} from "@/lib/workspaces/service";
import type { WorkspaceStatus } from "@/lib/workspaces/types";

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

export type StudentWorkspaceListPage = {
  items: StudentWorkspaceListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type StudentWorkspaceDetail = StudentWorkspaceListItem & {
  description: string | null;
  lecturer: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    title: string | null;
  };
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
}): Promise<StudentWorkspaceListPage> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, input.pageSize ?? 12));
  const q = input.q?.trim() ?? "";

  const conditions = [
    eq(workspaceMember.userId, input.studentId),
    inArray(workspaceMember.status, ["ACTIVE", "INVITED"]),
    eq(workspace.status, "ACTIVE"),
  ];

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

  const whereClause = and(...conditions);

  const [totalRow] = await db
    .select({ total: count() })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspace.id, workspaceMember.workspaceId))
    .innerJoin(userTable, eq(userTable.id, workspace.lecturerId))
    .where(whereClause);

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

  const uniqueSemesters = [...new Set(rows.map((r) => r.semester))];
  const semesterLabelEntries = await Promise.all(
    uniqueSemesters.map(async (value) => [value, await resolveSemesterLabel(value)] as const),
  );
  const semesterLabels = new Map(semesterLabelEntries);

  const items: StudentWorkspaceListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    className: row.className,
    semester: row.semester,
    semesterLabel: semesterLabels.get(row.semester) ?? row.semester,
    backgroundImageUrl: row.backgroundImageUrl,
    status: row.status as WorkspaceStatus,
    lecturerName: row.lecturerName,
    memberStatus: row.memberStatus as "INVITED" | "ACTIVE",
    joinedAt: row.joinedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }));

  return { items, total, page: safePage, pageSize, totalPages };
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
    })
    .from(userTable)
    .where(eq(userTable.id, ws.lecturerId))
    .limit(1);

  const lecturer = lecturerRows[0];
  if (!lecturer) throw new NotFoundError("Lecturer not found");

  const profileRows = await db
    .select({ title: lecturerProfile.title })
    .from(lecturerProfile)
    .where(eq(lecturerProfile.userId, ws.lecturerId))
    .limit(1);

  return {
    id: ws.id,
    name: ws.name,
    className: ws.className,
    semester: ws.semester,
    semesterLabel: await resolveSemesterLabel(ws.semester),
    backgroundImageUrl: ws.backgroundImageUrl,
    status: ws.status,
    lecturerName: lecturer.name,
    memberStatus: "ACTIVE",
    joinedAt: (member.joinedAt ?? new Date()).toISOString(),
    updatedAt: ws.updatedAt.toISOString(),
    description: ws.description,
    lecturer: {
      id: lecturer.id,
      name: lecturer.name,
      email: lecturer.email,
      image: lecturer.image,
      title: profileRows[0]?.title ?? null,
    },
  };
}
