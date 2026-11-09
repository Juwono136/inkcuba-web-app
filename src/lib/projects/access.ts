import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { assignment, assignmentGroupMember, workspace, workspaceMember } from "@/db/schema/workspaces";
import {
  STUDENT_ARCHIVE_STATUSES,
  STUDENT_EDITABLE_STATUSES,
  type ProjectStatus,
} from "@/lib/projects/limits";
import {
  submissionWindowState,
  type SubmissionScheduleMode,
  type SubmissionWindowState,
} from "@/lib/workspaces/submissions/types";

export type ProjectKind = "INDIVIDUAL" | "GROUP";

export type ProjectAccess = {
  kind: ProjectKind;
  isDetached: boolean;
  isCurrentMember: boolean;
  submissionReachable: boolean;
  canEdit: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canSubmit: boolean;
  windowState: SubmissionWindowState | null;
  submitBlockedReason: string | null;
  accessLabel: string;
  relationNote: string | null;
  backHref: string;
  backLabel: string;
};

type ProjectRow = {
  id: string;
  status: ProjectStatus | string;
  submittedById: string;
  workspaceId: string | null;
  assignmentId: string | null;
  groupId: string | null;
};

type SlotInfo = {
  id: string;
  workspaceId: string;
  status: string;
  scheduleMode: SubmissionScheduleMode;
  opensAt: Date | null;
  closesAt: Date | null;
};

type AccessContext = {
  memberGroupIds: Set<string>;
  liveWorkspaceIds: Set<string>;
  activeMembershipWorkspaceIds: Set<string>;
  slotsById: Map<string, SlotInfo>;
};

export function projectKind(input: {
  groupId: string | null;
  contributorCount: number;
}): ProjectKind {
  if (input.groupId) return "GROUP";
  return input.contributorCount > 1 ? "GROUP" : "INDIVIDUAL";
}

/** Linked drafts stay until archived. Detached records may be removed after they leave the live slot. */
export function studentCanDeleteStatus(status: string, assignmentId: string | null): boolean {
  if (status === "PUBLISHED") return false;
  if (status === "DRAFT" || status === "ARCHIVED" || status === "TAKEN_DOWN") return true;
  if (!assignmentId) {
    return (
      status === "SUBMITTED" ||
      status === "NEED_REVISION" ||
      status === "REVISED" ||
      status === "IN_REVIEW"
    );
  }
  return false;
}

function submitGate(slot: SlotInfo | null | undefined): {
  canSubmit: boolean;
  windowState: SubmissionWindowState | null;
  reason: string | null;
} {
  if (!slot) {
    return {
      canSubmit: false,
      windowState: null,
      reason: "This submission is no longer available.",
    };
  }
  if (slot.status === "CLOSED") {
    return {
      canSubmit: false,
      windowState: submissionWindowState(slot),
      reason: "This submission is closed.",
    };
  }
  if (slot.status !== "ACTIVE") {
    return {
      canSubmit: false,
      windowState: submissionWindowState(slot),
      reason: "This submission is not open for submit.",
    };
  }
  const windowState = submissionWindowState(slot);
  if (windowState === "UPCOMING") {
    return {
      canSubmit: false,
      windowState,
      reason: "The submission window has not opened yet.",
    };
  }
  if (windowState === "ENDED") {
    return {
      canSubmit: false,
      windowState,
      reason: "The submission window has ended. You can still prepare and save a draft on Project lists.",
    };
  }
  return { canSubmit: true, windowState, reason: null };
}

function buildProjectAccess(input: {
  project: ProjectRow;
  studentId: string;
  contributorCount: number;
  source?: "submission" | "lists";
  context: AccessContext;
}): ProjectAccess {
  const kind = projectKind({
    groupId: input.project.groupId,
    contributorCount: input.contributorCount,
  });
  const isDetached = !input.project.assignmentId || !input.project.workspaceId;
  const isCurrentMember =
    kind === "GROUP" && input.project.groupId
      ? input.context.memberGroupIds.has(input.project.groupId)
      : true;
  const workspaceOk =
    Boolean(input.project.workspaceId) &&
    input.context.liveWorkspaceIds.has(input.project.workspaceId!) &&
    input.context.activeMembershipWorkspaceIds.has(input.project.workspaceId!);
  const slot = input.project.assignmentId
    ? input.context.slotsById.get(input.project.assignmentId)
    : null;
  const submissionReachable = Boolean(
    workspaceOk && slot && slot.workspaceId === input.project.workspaceId,
  );

  const statusEditable = (STUDENT_EDITABLE_STATUSES as string[]).includes(input.project.status);
  const liveGroupLock = Boolean(input.project.assignmentId && input.project.groupId);
  const groupActorAllowed = kind === "INDIVIDUAL" || !liveGroupLock || isCurrentMember;
  const canEdit = statusEditable && groupActorAllowed;
  const canArchive =
    (STUDENT_ARCHIVE_STATUSES as string[]).includes(input.project.status) && groupActorAllowed;
  const canDelete =
    studentCanDeleteStatus(input.project.status, input.project.assignmentId) && groupActorAllowed;
  const gate = submitGate(slot);
  const canSubmit =
    canEdit && submissionReachable && !isDetached && gate.canSubmit;

  let accessLabel = "View only";
  let relationNote: string | null = null;
  if (canEdit) {
    accessLabel = "Editable";
    if (!canSubmit && gate.reason && submissionReachable) {
      relationNote = gate.reason;
    }
  } else if (kind === "GROUP" && liveGroupLock && !isCurrentMember) {
    accessLabel = "View only · Left group";
    relationNote =
      "You left this group, or your lecturer moved you. The project stays with the group. Only current members can edit it, and only your lecturer can move members.";
  } else if (isDetached) {
    accessLabel = "Detached";
    relationNote =
      "The workspace or submission is no longer available. The project stays on Project lists with its saved details and files.";
  } else if (!(STUDENT_EDITABLE_STATUSES as string[]).includes(input.project.status)) {
    accessLabel = "Read only";
    relationNote = "This project is no longer in an editable status.";
  }

  const fromSubmission = input.source === "submission" && submissionReachable;
  const backHref = fromSubmission
    ? `/dashboard/student/workspaces/${input.project.workspaceId}?tab=submission&submission=${input.project.assignmentId}&view=groups`
    : "/dashboard/student/projects";
  const backLabel = fromSubmission ? "Submission" : "Project lists";

  return {
    kind,
    isDetached,
    isCurrentMember,
    submissionReachable,
    canEdit,
    canArchive,
    canDelete,
    canSubmit,
    windowState: gate.windowState,
    submitBlockedReason: canSubmit ? null : gate.reason,
    accessLabel,
    relationNote,
    backHref,
    backLabel,
  };
}

async function loadAccessContext(
  studentId: string,
  projects: ProjectRow[],
): Promise<AccessContext> {
  const groupIds = [
    ...new Set(projects.map((row) => row.groupId).filter((id): id is string => Boolean(id))),
  ];
  const workspaceIds = [
    ...new Set(projects.map((row) => row.workspaceId).filter((id): id is string => Boolean(id))),
  ];
  const assignmentIds = [
    ...new Set(projects.map((row) => row.assignmentId).filter((id): id is string => Boolean(id))),
  ];

  const [memberRows, workspaceRows, membershipRows, slotRows] = await Promise.all([
    groupIds.length > 0
      ? db
          .select({ groupId: assignmentGroupMember.groupId })
          .from(assignmentGroupMember)
          .where(
            and(
              eq(assignmentGroupMember.userId, studentId),
              inArray(assignmentGroupMember.groupId, groupIds),
            ),
          )
      : Promise.resolve([] as Array<{ groupId: string }>),
    workspaceIds.length > 0
      ? db
          .select({ id: workspace.id, deletedAt: workspace.deletedAt })
          .from(workspace)
          .where(inArray(workspace.id, workspaceIds))
      : Promise.resolve([] as Array<{ id: string; deletedAt: Date | null }>),
    workspaceIds.length > 0
      ? db
          .select({ workspaceId: workspaceMember.workspaceId })
          .from(workspaceMember)
          .where(
            and(
              eq(workspaceMember.userId, studentId),
              eq(workspaceMember.status, "ACTIVE"),
              inArray(workspaceMember.workspaceId, workspaceIds),
            ),
          )
      : Promise.resolve([] as Array<{ workspaceId: string }>),
    assignmentIds.length > 0
      ? db
          .select({
            id: assignment.id,
            workspaceId: assignment.workspaceId,
            status: assignment.status,
            scheduleMode: assignment.scheduleMode,
            opensAt: assignment.opensAt,
            closesAt: assignment.closesAt,
          })
          .from(assignment)
          .where(inArray(assignment.id, assignmentIds))
      : Promise.resolve([] as SlotInfo[]),
  ]);

  return {
    memberGroupIds: new Set(memberRows.map((row) => row.groupId)),
    liveWorkspaceIds: new Set(
      workspaceRows.filter((row) => !row.deletedAt).map((row) => row.id),
    ),
    activeMembershipWorkspaceIds: new Set(membershipRows.map((row) => row.workspaceId)),
    slotsById: new Map(slotRows.map((row) => [row.id, row])),
  };
}

export async function resolveProjectAccess(input: {
  project: ProjectRow;
  studentId: string;
  contributorCount: number;
  source?: "submission" | "lists";
}): Promise<ProjectAccess> {
  const context = await loadAccessContext(input.studentId, [input.project]);
  return buildProjectAccess({ ...input, context });
}

/** Batch access checks for project lists — one round of lookups instead of N×queries. */
export async function resolveProjectAccessBatch(input: {
  studentId: string;
  projects: ProjectRow[];
  contributorCounts: Map<string, number>;
  source?: "submission" | "lists";
}): Promise<Map<string, ProjectAccess>> {
  const context = await loadAccessContext(input.studentId, input.projects);
  const result = new Map<string, ProjectAccess>();
  for (const project of input.projects) {
    result.set(
      project.id,
      buildProjectAccess({
        project,
        studentId: input.studentId,
        contributorCount: input.contributorCounts.get(project.id) ?? 1,
        source: input.source,
        context,
      }),
    );
  }
  return result;
}

export async function isActiveGroupMember(groupId: string, studentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: assignmentGroupMember.id })
    .from(assignmentGroupMember)
    .where(
      and(eq(assignmentGroupMember.groupId, groupId), eq(assignmentGroupMember.userId, studentId)),
    )
    .limit(1);
  return Boolean(row);
}

export async function submissionIsReachable(
  workspaceId: string | null,
  assignmentId: string | null,
  studentId: string,
): Promise<boolean> {
  if (!workspaceId || !assignmentId) return false;
  const context = await loadAccessContext(studentId, [
    {
      id: "_",
      status: "DRAFT",
      submittedById: studentId,
      workspaceId,
      assignmentId,
      groupId: null,
    },
  ]);
  const slot = context.slotsById.get(assignmentId);
  return Boolean(
    context.liveWorkspaceIds.has(workspaceId) &&
      context.activeMembershipWorkspaceIds.has(workspaceId) &&
      slot &&
      slot.workspaceId === workspaceId,
  );
}
