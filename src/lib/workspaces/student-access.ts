import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { workspace } from "@/db/schema/workspaces";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/api/errors";
import { isValidWorkspaceInviteCode } from "@/lib/workspaces/members/types";
import {
  isWorkspaceOpenToStudents,
  WORKSPACE_STATUS_LABELS,
} from "@/lib/workspaces/types";

/**
 * Lightweight student workspace guards — kept separate from `workspaces/service`
 * so student submission APIs do not pull the heavy workspace↔project import graph
 * (and optional BullMQ clients) into every request compile/runtime path.
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
  if (!row || row.deletedAt) throw new NotFoundError("Workspace not found");

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
  const code = inviteCode.trim().toLowerCase();
  if (!isValidWorkspaceInviteCode(code)) {
    throw new ValidationError(
      "Invite code must be exactly 8 lowercase letters or digits",
    );
  }

  const rows = await db
    .select()
    .from(workspace)
    .where(eq(workspace.inviteCode, code))
    .limit(1);

  const row = rows[0];
  if (!row || row.deletedAt) throw new NotFoundError("Invalid invite code");

  if (!isWorkspaceOpenToStudents(row.status)) {
    throw new ForbiddenError(
      row.status === "DRAFT"
        ? "This workspace is still a draft and is not open to students yet."
        : "This workspace is inactive and cannot be accessed by students.",
    );
  }

  return row;
}
