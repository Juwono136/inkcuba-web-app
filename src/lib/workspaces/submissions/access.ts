import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { workspace, workspaceMember } from "@/db/schema/workspaces";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { assertStudentCanAccessWorkspace } from "@/lib/workspaces/service";

export async function loadOwnedWorkspace(workspaceId: string, lecturerId: string) {
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

export async function assertActiveStudentMember(
  workspaceId: string,
  studentId: string,
) {
  const ws = await assertStudentCanAccessWorkspace(workspaceId);
  const rows = await db
    .select({ id: workspaceMember.id })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, studentId),
        eq(workspaceMember.status, "ACTIVE"),
      ),
    )
    .limit(1);

  if (!rows[0]) {
    throw new ForbiddenError("You are not an active member of this workspace");
  }

  return ws;
}
