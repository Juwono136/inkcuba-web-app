import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { studentProfile } from "@/db/schema/profiles";
import {
  portfolio,
  portfolioContributor,
  portfolioDocument,
  portfolioImage,
  portfolioLink,
  portfolioVideo,
} from "@/db/schema/portfolios";
import {
  assignment,
  assignmentGroup,
  assignmentGroupMember,
  workspace,
} from "@/db/schema/workspaces";
import { createAuditLog } from "@/lib/audit";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { resolveDirectoryLabels } from "@/lib/directory/service";
import { getRedisClient } from "@/lib/redis";
import { toMediaProxyUrl } from "@/lib/workspaces/sanitize-description";
import { submissionWindowState } from "@/lib/workspaces/submissions/types";
import { assertActiveStudentMember, loadOwnedWorkspace } from "@/lib/workspaces/submissions/access";
import { resolveProjectAccess, resolveProjectAccessBatch } from "@/lib/projects/access";
import {
  PROJECT_ADDITIONAL_DOC_MAX,
  PROJECT_IMAGE_MAX,
  STUDENT_EDITABLE_STATUSES,
  type ProjectStatus,
} from "@/lib/projects/limits";
import {
  deleteProjectObject,
  storeProjectDocument,
  storeProjectImage,
  storeProjectVideo,
} from "@/lib/projects/media";
import { plainProjectText, sanitizeProjectDescription } from "@/lib/projects/sanitize";
import type { ProjectListQuery, ProjectWriteInput } from "@/lib/projects/validators";

type Actor = { actorId: string; ipAddress?: string | null; userAgent?: string | null };

function imageUrl(image: string | null): string | null {
  if (!image) return null;
  if (image.startsWith("http") || image.startsWith("/")) return image;
  return toMediaProxyUrl(image);
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function isUniqueViolation(error: unknown): boolean {
  const seen = error as { code?: string; cause?: { code?: string } };
  return seen.code === "23505" || seen.cause?.code === "23505";
}

async function academicSnapshot(studentId: string, ws: typeof workspace.$inferSelect, slotTitle: string) {
  const [lecturer] = await db
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, ws.lecturerId))
    .limit(1);
  const [profile] = await db
    .select()
    .from(studentProfile)
    .where(eq(studentProfile.userId, studentId))
    .limit(1);
  const [student] = await db
    .select({ campus: userTable.campus, name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, studentId))
    .limit(1);
  const workspaceLabels = await resolveDirectoryLabels([
    { category: "semester", value: ws.semester },
  ]);
  const profileLabels = await resolveDirectoryLabels([
    { category: "major", value: profile?.major },
    { category: "batch", value: profile?.batch },
    { category: "semester", value: profile?.semester },
    { category: "campus", value: student?.campus },
  ]);
  return {
    workspaceName: ws.name,
    className: ws.className,
    semesterLabel: workspaceLabels.semester ?? ws.semester,
    submissionTitle: slotTitle,
    lecturerName: lecturer?.name ?? "Lecturer",
    campus: student?.campus ? profileLabels.campus ?? student.campus : null,
    major: profile?.major ? profileLabels.major ?? profile.major : null,
    batch: profile?.batch ? profileLabels.batch ?? profile.batch : null,
    academicSemester: profile?.semester ? profileLabels.semester ?? profile.semester : null,
  };
}

/** Copy live workspace and submission text onto projects before those rows are deleted. */
export async function preserveProjectSnapshots(
  filter: { workspaceId: string } | { assignmentId: string },
) {
  const rows = await db
    .select({
      id: portfolio.id,
      submittedById: portfolio.submittedById,
      workspaceId: portfolio.workspaceId,
      assignmentId: portfolio.assignmentId,
    })
    .from(portfolio)
    .where(
      "workspaceId" in filter
        ? eq(portfolio.workspaceId, filter.workspaceId)
        : eq(portfolio.assignmentId, filter.assignmentId),
    );
  for (const row of rows) {
    if (!row.workspaceId || !row.assignmentId) continue;
    const [ws] = await db.select().from(workspace).where(eq(workspace.id, row.workspaceId)).limit(1);
    const [slot] = await db
      .select({ title: assignment.title })
      .from(assignment)
      .where(eq(assignment.id, row.assignmentId))
      .limit(1);
    if (!ws || !slot) continue;
    const snapshot = await academicSnapshot(row.submittedById, ws, slot.title);
    await db.update(portfolio).set(snapshot).where(eq(portfolio.id, row.id));
  }
}

export async function openStudentProject(input: {
  workspaceId: string;
  submissionId: string;
  studentId: string;
  meta: Actor;
}) {
  const ws = await assertActiveStudentMember(input.workspaceId, input.studentId);
  try {
    return await db.transaction(async (tx) => {
    const [slot] = await tx
      .select()
      .from(assignment)
      .where(and(eq(assignment.id, input.submissionId), eq(assignment.workspaceId, ws.id)))
      .for("update")
      .limit(1);
    if (!slot || slot.status === "DRAFT") throw new NotFoundError("Submission not found");

    let groupId: string | null = null;
    if (slot.type === "GROUP") {
      const [membership] = await tx
        .select({ groupId: assignmentGroupMember.groupId })
        .from(assignmentGroupMember)
        .where(
          and(
            eq(assignmentGroupMember.assignmentId, slot.id),
            eq(assignmentGroupMember.userId, input.studentId),
          ),
        )
        .limit(1);
      if (!membership) throw new ValidationError("Join a group before preparing this project.");
      groupId = membership.groupId;
    }

    const existing = await tx
      .select()
      .from(portfolio)
      .where(
        groupId
          ? and(eq(portfolio.assignmentId, slot.id), eq(portfolio.groupId, groupId))
          : and(
              eq(portfolio.assignmentId, slot.id),
              eq(portfolio.submittedById, input.studentId),
              sql`${portfolio.groupId} is null`,
            ),
      )
      .limit(1);

    if (existing[0]) {
      await ensureContributor(tx, existing[0].id, input.studentId);
      return { id: existing[0].id };
    }

    const snapshot = await academicSnapshot(input.studentId, ws, slot.title);
    const id = crypto.randomUUID();
    const memberIds = groupId
      ? (
          await tx
            .select({ userId: assignmentGroupMember.userId })
            .from(assignmentGroupMember)
            .where(eq(assignmentGroupMember.groupId, groupId))
        ).map((row) => row.userId)
      : [input.studentId];
    await tx.insert(portfolio).values({
      id,
      workspaceId: ws.id,
      assignmentId: slot.id,
      submittedById: input.studentId,
      groupId,
      title: slot.title,
      status: "DRAFT",
      ...snapshot,
    });
    await tx.insert(portfolioContributor).values(
      memberIds.map((userId) => ({
        id: crypto.randomUUID(),
        portfolioId: id,
        userId,
      })),
    );
    await createAuditLog({
      actorId: input.meta.actorId,
      action: "project.create",
      entityType: "portfolio",
      entityId: id,
      metadata: { workspaceId: ws.id, assignmentId: slot.id, groupId },
      ipAddress: input.meta.ipAddress,
      userAgent: input.meta.userAgent,
    });
    return { id };
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const recovered = await findOpenProject(input.submissionId, input.studentId);
    if (!recovered) throw error;
    return recovered;
  }
}

async function findOpenProject(submissionId: string, studentId: string) {
  const [slot] = await db
    .select({ id: assignment.id, type: assignment.type })
    .from(assignment)
    .where(eq(assignment.id, submissionId))
    .limit(1);
  if (!slot) return null;
  let groupId: string | null = null;
  if (slot.type === "GROUP") {
    const [membership] = await db
      .select({ groupId: assignmentGroupMember.groupId })
      .from(assignmentGroupMember)
      .where(
        and(
          eq(assignmentGroupMember.assignmentId, slot.id),
          eq(assignmentGroupMember.userId, studentId),
        ),
      )
      .limit(1);
    groupId = membership?.groupId ?? null;
    if (!groupId) return null;
  }
  const [row] = await db
    .select({ id: portfolio.id })
    .from(portfolio)
    .where(
      groupId
        ? and(eq(portfolio.assignmentId, slot.id), eq(portfolio.groupId, groupId))
        : and(
            eq(portfolio.assignmentId, slot.id),
            eq(portfolio.submittedById, studentId),
            sql`${portfolio.groupId} is null`,
          ),
    )
    .limit(1);
  if (!row) return null;
  await db.transaction(async (tx) => {
    await ensureContributor(tx, row.id, studentId);
  });
  return { id: row.id };
}

async function ensureContributor(tx: Tx, portfolioId: string, userId: string) {
  const [row] = await tx
    .select({ id: portfolioContributor.id })
    .from(portfolioContributor)
    .where(and(eq(portfolioContributor.portfolioId, portfolioId), eq(portfolioContributor.userId, userId)))
    .limit(1);
  if (row) return;
  await tx.insert(portfolioContributor).values({
    id: crypto.randomUUID(),
    portfolioId,
    userId,
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function loadEditable(portfolioId: string, studentId: string) {
  const project = await loadVisible(portfolioId, studentId);
  if (!(STUDENT_EDITABLE_STATUSES as string[]).includes(project.status)) {
    throw new ValidationError("This project can no longer be edited");
  }
  // Live group projects stay with the group. Detached records (submission/group removed)
  // remain editable by any recorded contributor while the status allows it.
  if (project.groupId && project.assignmentId) {
    const [member] = await db
      .select({ id: assignmentGroupMember.id })
      .from(assignmentGroupMember)
      .where(
        and(
          eq(assignmentGroupMember.groupId, project.groupId),
          eq(assignmentGroupMember.userId, studentId),
        ),
      )
      .limit(1);
    if (!member) throw new ForbiddenError("Only current group members can edit this project");
  }
  return project;
}

async function contributorCount(portfolioId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(portfolioContributor)
    .where(eq(portfolioContributor.portfolioId, portfolioId));
  return Number(row?.value ?? 0);
}

async function loadVisible(portfolioId: string, studentId: string) {
  const [row] = await db.select().from(portfolio).where(eq(portfolio.id, portfolioId)).limit(1);
  if (!row) throw new NotFoundError("Project not found");
  const [contributor] = await db
    .select({ id: portfolioContributor.id })
    .from(portfolioContributor)
    .where(
      and(eq(portfolioContributor.portfolioId, row.id), eq(portfolioContributor.userId, studentId)),
    )
    .limit(1);
  if (row.submittedById !== studentId && !contributor) {
    throw new ForbiddenError("You cannot open this project");
  }
  return row;
}

function assertFresh(current: Date, expected?: string) {
  if (!expected) return;
  const incoming = new Date(expected);
  if (Number.isNaN(incoming.getTime()) || incoming.getTime() !== current.getTime()) {
    throw new ConflictError("This project was updated by someone else. Reload and try again.");
  }
}

export async function saveStudentProject(input: {
  portfolioId: string;
  studentId: string;
  data: ProjectWriteInput;
  meta: Actor;
}) {
  const description = sanitizeProjectDescription(input.data.description);
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(portfolio)
      .where(eq(portfolio.id, input.portfolioId))
      .for("update")
      .limit(1);
    if (!current) throw new NotFoundError("Project not found");
    await loadEditable(current.id, input.studentId);
    assertFresh(current.updatedAt, input.data.expectedUpdatedAt);
    await tx
      .update(portfolio)
      .set({
        title: input.data.title,
        description,
        demoUrl: blankToNull(input.data.demoUrl),
        videoUrl: blankToNull(input.data.videoUrl),
        sourceUrl: blankToNull(input.data.sourceUrl),
        updatedAt: new Date(),
      })
      .where(eq(portfolio.id, current.id));
    await tx.delete(portfolioLink).where(eq(portfolioLink.portfolioId, current.id));
    if (input.data.links.length > 0) {
      await tx.insert(portfolioLink).values(
        input.data.links.map((link, index) => ({
          id: crypto.randomUUID(),
          portfolioId: current.id,
          label: blankToNull(link.label),
          url: link.url,
          sortOrder: index,
        })),
      );
    }
  });
  await createAuditLog({
    actorId: input.meta.actorId,
    action: "project.save",
    entityType: "portfolio",
    entityId: input.portfolioId,
    ipAddress: input.meta.ipAddress,
    userAgent: input.meta.userAgent,
  });
  return getStudentProject({ portfolioId: input.portfolioId, studentId: input.studentId });
}

export async function submitStudentProject(input: {
  portfolioId: string;
  studentId: string;
  idempotencyKey?: string | null;
  meta: Actor;
}) {
  const cacheKey = input.idempotencyKey
    ? `project:submit:${input.studentId}:${input.portfolioId}:${input.idempotencyKey}`
    : null;
  if (cacheKey) {
    const redis = getRedisClient();
    const acquired = await redis.set(cacheKey, "pending", "EX", 60, "NX");
    if (acquired !== "OK") {
      const existing = await redis.get(cacheKey);
      if (existing && existing !== "pending") {
        try {
          return JSON.parse(existing) as { id: string; status: ProjectStatus };
        } catch {
          throw new ConflictError("This submit is already running. Wait a moment, then try again.");
        }
      }
      throw new ConflictError("This submit is already running. Wait a moment, then try again.");
    }
  }
  try {
    const result = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(portfolio)
        .where(eq(portfolio.id, input.portfolioId))
        .for("update")
        .limit(1);
      if (!current) throw new NotFoundError("Project not found");
      await loadEditable(current.id, input.studentId);
      const nextStatus: ProjectStatus = current.status === "NEED_REVISION" ? "REVISED" : "SUBMITTED";
      if (current.status !== "DRAFT" && current.status !== "NEED_REVISION") {
        throw new ValidationError("This project cannot be submitted from its current status");
      }
      await assertReadyToSubmit(tx, current);
      await tx
        .update(portfolio)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(eq(portfolio.id, current.id));
      await createAuditLog({
        actorId: input.meta.actorId,
        action: "project.submit",
        entityType: "portfolio",
        entityId: current.id,
        metadata: { status: nextStatus },
        ipAddress: input.meta.ipAddress,
        userAgent: input.meta.userAgent,
      });
      return { id: current.id, status: nextStatus };
    });
    if (cacheKey) {
      try {
        await getRedisClient().set(cacheKey, JSON.stringify(result), "EX", 600);
      } catch {
        // The submit already committed. Leave the short lock so a retry does not double-send.
      }
    }
    return result;
  } catch (error) {
    if (cacheKey) await getRedisClient().del(cacheKey);
    throw error;
  }
}

async function assertReadyToSubmit(tx: Tx, current: typeof portfolio.$inferSelect) {
  if (current.title.trim().length < 3) throw new ValidationError("Project title is required");
  if (!plainProjectText(current.description)) throw new ValidationError("Project description is required");
  if (!current.demoUrl) throw new ValidationError("A demo URL is required");
  const [images] = await tx
    .select({ value: count() })
    .from(portfolioImage)
    .where(eq(portfolioImage.portfolioId, current.id));
  if (Number(images?.value ?? 0) < 1) throw new ValidationError("Add at least one overview image");
  const [docs] = await tx
    .select({ value: count() })
    .from(portfolioDocument)
    .where(and(eq(portfolioDocument.portfolioId, current.id), eq(portfolioDocument.role, "PROJECT")));
  if (Number(docs?.value ?? 0) < 1) throw new ValidationError("Project documentation is required");
  if (!current.assignmentId) throw new ValidationError("This submission is no longer available");
  const [slot] = await tx.select().from(assignment).where(eq(assignment.id, current.assignmentId)).limit(1);
  if (!slot || slot.status !== "ACTIVE") {
    throw new ValidationError("This submission is not open for submit");
  }
  const windowState = submissionWindowState({
    scheduleMode: slot.scheduleMode,
    opensAt: slot.opensAt,
    closesAt: slot.closesAt,
  });
  if (windowState === "UPCOMING") throw new ValidationError("The submission window has not opened yet");
  if (windowState === "ENDED") throw new ValidationError("The submission window has ended");
  if (current.groupId) {
    const [members] = await tx
      .select({ value: count() })
      .from(assignmentGroupMember)
      .where(eq(assignmentGroupMember.groupId, current.groupId));
    if (Number(members?.value ?? 0) < 2) {
      throw new ValidationError("A group needs at least 2 members before the project can be submitted");
    }
  }
}

export async function archiveStudentProject(input: {
  portfolioId: string;
  studentId: string;
  meta: Actor;
}) {
  const current = await loadVisible(input.portfolioId, input.studentId);
  const access = await resolveProjectAccess({
    project: current,
    studentId: input.studentId,
    contributorCount: await contributorCount(current.id),
  });
  if (!access.canArchive) {
    throw new ValidationError("This project cannot be archived");
  }
  await db
    .update(portfolio)
    .set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(eq(portfolio.id, current.id));
  await createAuditLog({
    actorId: input.meta.actorId,
    action: "project.archive",
    entityType: "portfolio",
    entityId: current.id,
    ipAddress: input.meta.ipAddress,
    userAgent: input.meta.userAgent,
  });
  return { id: current.id, status: "ARCHIVED" as const };
}

/** Hard-delete a project and every SeaweedFS object under it. */
export async function deleteStudentProject(input: {
  portfolioId: string;
  studentId: string;
  meta: Actor;
}) {
  const current = await loadVisible(input.portfolioId, input.studentId);
  const access = await resolveProjectAccess({
    project: current,
    studentId: input.studentId,
    contributorCount: await contributorCount(current.id),
  });
  if (!access.canDelete) {
    throw new ForbiddenError("You cannot delete this project");
  }
  const [images, documents, videos] = await Promise.all([
    db.select({ storageKey: portfolioImage.storageKey }).from(portfolioImage).where(eq(portfolioImage.portfolioId, current.id)),
    db
      .select({ storageKey: portfolioDocument.storageKey })
      .from(portfolioDocument)
      .where(eq(portfolioDocument.portfolioId, current.id)),
    db.select({ storageKey: portfolioVideo.storageKey }).from(portfolioVideo).where(eq(portfolioVideo.portfolioId, current.id)),
  ]);
  const keys = [
    ...images.map((row) => row.storageKey),
    ...documents.map((row) => row.storageKey),
    ...videos.map((row) => row.storageKey),
  ];
  await db.delete(portfolio).where(eq(portfolio.id, current.id));
  await Promise.all(keys.map((key) => deleteProjectObject(key)));
  await createAuditLog({
    actorId: input.meta.actorId,
    action: "project.delete",
    entityType: "portfolio",
    entityId: current.id,
    metadata: { kind: access.kind, filesRemoved: keys.length },
    ipAddress: input.meta.ipAddress,
    userAgent: input.meta.userAgent,
  });
  return { id: current.id, deleted: true as const };
}

export async function addProjectImage(input: {
  portfolioId: string;
  studentId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}) {
  const current = await loadEditable(input.portfolioId, input.studentId);
  const [existing] = await db
    .select({ value: count() })
    .from(portfolioImage)
    .where(eq(portfolioImage.portfolioId, current.id));
  if (Number(existing?.value ?? 0) >= PROJECT_IMAGE_MAX) {
    throw new ValidationError("A project can have at most 3 overview images");
  }
  const stored = await storeProjectImage({
    portfolioId: current.id,
    buffer: input.buffer,
    mimeType: input.mimeType,
    fileName: input.fileName,
  });
  const id = crypto.randomUUID();
  await db.insert(portfolioImage).values({
    id,
    portfolioId: current.id,
    storageKey: stored.key,
    url: stored.url,
    mimeType: stored.mimeType,
    size: stored.size,
    isPoster: Number(existing?.value ?? 0) === 0,
    sortOrder: Number(existing?.value ?? 0),
  });
  return { id, url: stored.url };
}

export async function removeProjectImage(input: {
  portfolioId: string;
  imageId: string;
  studentId: string;
}) {
  const current = await loadEditable(input.portfolioId, input.studentId);
  const [image] = await db
    .select()
    .from(portfolioImage)
    .where(and(eq(portfolioImage.id, input.imageId), eq(portfolioImage.portfolioId, current.id)))
    .limit(1);
  if (!image) throw new NotFoundError("Image not found");
  await db.delete(portfolioImage).where(eq(portfolioImage.id, image.id));
  await deleteProjectObject(image.storageKey);
}

export async function replaceProjectVideo(input: {
  portfolioId: string;
  studentId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}) {
  const current = await loadEditable(input.portfolioId, input.studentId);
  const [previous] = await db
    .select()
    .from(portfolioVideo)
    .where(eq(portfolioVideo.portfolioId, current.id))
    .limit(1);
  const stored = await storeProjectVideo({
    portfolioId: current.id,
    buffer: input.buffer,
    mimeType: input.mimeType,
    fileName: input.fileName,
  });
  if (previous) {
    await db
      .update(portfolioVideo)
      .set({
        storageKey: stored.key,
        url: stored.url,
        mimeType: stored.mimeType,
        size: stored.size,
        durationSeconds: stored.durationSeconds,
      })
      .where(eq(portfolioVideo.id, previous.id));
    await deleteProjectObject(previous.storageKey);
    return { id: previous.id, url: stored.url };
  }
  const id = crypto.randomUUID();
  await db.insert(portfolioVideo).values({
    id,
    portfolioId: current.id,
    storageKey: stored.key,
    url: stored.url,
    mimeType: stored.mimeType,
    size: stored.size,
    durationSeconds: stored.durationSeconds,
  });
  return { id, url: stored.url };
}

export async function removeProjectVideo(input: { portfolioId: string; studentId: string }) {
  const current = await loadEditable(input.portfolioId, input.studentId);
  const [video] = await db
    .select()
    .from(portfolioVideo)
    .where(eq(portfolioVideo.portfolioId, current.id))
    .limit(1);
  if (!video) return;
  await db.delete(portfolioVideo).where(eq(portfolioVideo.id, video.id));
  await deleteProjectObject(video.storageKey);
}

export async function addProjectDocument(input: {
  portfolioId: string;
  studentId: string;
  role: "PROJECT" | "ADDITIONAL";
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}) {
  const current = await loadEditable(input.portfolioId, input.studentId);
  const rows = await db
    .select()
    .from(portfolioDocument)
    .where(and(eq(portfolioDocument.portfolioId, current.id), eq(portfolioDocument.role, input.role)));
  if (input.role === "PROJECT" && rows[0]) {
    const stored = await storeProjectDocument({
      portfolioId: current.id,
      role: input.role,
      buffer: input.buffer,
      mimeType: input.mimeType,
      fileName: input.fileName,
    });
    await db
      .update(portfolioDocument)
      .set({
        storageKey: stored.key,
        url: stored.url,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        size: stored.size,
      })
      .where(eq(portfolioDocument.id, rows[0].id));
    await deleteProjectObject(rows[0].storageKey);
    return { id: rows[0].id, url: stored.url, fileName: stored.fileName };
  }
  if (input.role === "ADDITIONAL" && rows.length >= PROJECT_ADDITIONAL_DOC_MAX) {
    throw new ValidationError("You can add at most 3 additional documents");
  }
  const stored = await storeProjectDocument({
    portfolioId: current.id,
    role: input.role,
    buffer: input.buffer,
    mimeType: input.mimeType,
    fileName: input.fileName,
  });
  const id = crypto.randomUUID();
  await db.insert(portfolioDocument).values({
    id,
    portfolioId: current.id,
    role: input.role,
    storageKey: stored.key,
    url: stored.url,
    fileName: stored.fileName,
    mimeType: stored.mimeType,
    size: stored.size,
  });
  return { id, url: stored.url, fileName: stored.fileName };
}

export async function removeProjectDocument(input: {
  portfolioId: string;
  documentId: string;
  studentId: string;
}) {
  const current = await loadEditable(input.portfolioId, input.studentId);
  const [doc] = await db
    .select()
    .from(portfolioDocument)
    .where(and(eq(portfolioDocument.id, input.documentId), eq(portfolioDocument.portfolioId, current.id)))
    .limit(1);
  if (!doc) throw new NotFoundError("Document not found");
  await db.delete(portfolioDocument).where(eq(portfolioDocument.id, doc.id));
  await deleteProjectObject(doc.storageKey);
}

export async function getStudentProject(input: {
  portfolioId: string;
  studentId: string;
  source?: "submission" | "lists";
}) {
  const current = await loadVisible(input.portfolioId, input.studentId);
  const contribCount = await contributorCount(current.id);
  const access = await resolveProjectAccess({
    project: current,
    studentId: input.studentId,
    contributorCount: contribCount,
    source: input.source,
  });
  const [images, documents, links, videoRows] = await Promise.all([
    db.select().from(portfolioImage).where(eq(portfolioImage.portfolioId, current.id)).orderBy(asc(portfolioImage.sortOrder)),
    db.select().from(portfolioDocument).where(eq(portfolioDocument.portfolioId, current.id)),
    db.select().from(portfolioLink).where(eq(portfolioLink.portfolioId, current.id)).orderBy(asc(portfolioLink.sortOrder)),
    db.select().from(portfolioVideo).where(eq(portfolioVideo.portfolioId, current.id)).limit(1),
  ]);
  const people = current.groupId
    ? await db
        .select({
          userId: userTable.id,
          name: userTable.name,
          nim: userTable.nim,
          image: userTable.image,
        })
        .from(assignmentGroupMember)
        .innerJoin(userTable, eq(userTable.id, assignmentGroupMember.userId))
        .where(eq(assignmentGroupMember.groupId, current.groupId))
        .orderBy(asc(userTable.name))
    : await db
        .select({
          userId: userTable.id,
          name: userTable.name,
          nim: userTable.nim,
          image: userTable.image,
        })
        .from(portfolioContributor)
        .innerJoin(userTable, eq(userTable.id, portfolioContributor.userId))
        .where(eq(portfolioContributor.portfolioId, current.id))
        .orderBy(asc(userTable.name));
  return {
    id: current.id,
    title: current.title,
    description: current.description ?? "",
    demoUrl: current.demoUrl ?? "",
    videoUrl: current.videoUrl ?? "",
    sourceUrl: current.sourceUrl ?? "",
    status: current.status,
    updatedAt: current.updatedAt.toISOString(),
    kind: access.kind,
    mode: input.source === "submission" && access.submissionReachable ? "prepare" : "library",
    canEdit: access.canEdit,
    canArchive: access.canArchive,
    canDelete: access.canDelete,
    canSubmit: access.canSubmit,
    windowState: access.windowState,
    submitBlockedReason: access.submitBlockedReason,
    isDetached: access.isDetached,
    accessLabel: access.accessLabel,
    relationNote: access.relationNote,
    backHref: access.backHref,
    backLabel: access.backLabel,
    submissionHref: access.submissionReachable
      ? `/dashboard/student/workspaces/${current.workspaceId}?tab=submission&submission=${current.assignmentId}&view=groups`
      : null,
    workspaceId: current.workspaceId,
    assignmentId: current.assignmentId,
    groupId: current.groupId,
    summary: {
      workspaceName: current.workspaceName,
      className: current.className,
      semesterLabel: current.semesterLabel,
      submissionTitle: current.submissionTitle,
      lecturerName: current.lecturerName,
      campus: current.campus,
      major: current.major,
      batch: current.batch,
      academicSemester: current.academicSemester,
    },
    members: people.map((person) => ({
      ...person,
      image: imageUrl(person.image),
    })),
    images: images.map((image) => ({ id: image.id, url: image.url })),
    video: videoRows[0] ? { id: videoRows[0].id, url: videoRows[0].url } : null,
    documents: documents.map((doc) => ({
      id: doc.id,
      role: doc.role,
      fileName: doc.fileName,
      url: doc.url,
    })),
    links: links.map((link) => ({ label: link.label ?? "", url: link.url })),
  };
}

export async function listStudentProjects(input: { studentId: string; query: ProjectListQuery }) {
  const mine = await db
    .select({ id: portfolioContributor.portfolioId })
    .from(portfolioContributor)
    .where(eq(portfolioContributor.userId, input.studentId));
  const ids = mine.map((row) => row.id);
  const access =
    ids.length > 0
      ? or(eq(portfolio.submittedById, input.studentId), inArray(portfolio.id, ids))
      : eq(portfolio.submittedById, input.studentId);
  const filters = [access];
  if (input.query.status !== "ALL") filters.push(eq(portfolio.status, input.query.status));
  if (input.query.q) {
    const safe = input.query.q.replace(/[%_]/g, "");
    if (safe) filters.push(ilike(portfolio.title, `%${safe}%`));
  }
  const where = and(...filters);
  const order =
    input.query.sortBy === "title"
      ? input.query.sortDir === "asc"
        ? asc(portfolio.title)
        : desc(portfolio.title)
      : input.query.sortBy === "status"
        ? input.query.sortDir === "asc"
          ? asc(portfolio.status)
          : desc(portfolio.status)
        : input.query.sortDir === "asc"
          ? asc(portfolio.updatedAt)
          : desc(portfolio.updatedAt);
  const [totalRow] = await db.select({ value: count() }).from(portfolio).where(where);
  const total = Number(totalRow?.value ?? 0);
  const pageSize = input.query.pageSize;
  const page = input.query.page;
  const items = await db
    .select({
      id: portfolio.id,
      title: portfolio.title,
      status: portfolio.status,
      updatedAt: portfolio.updatedAt,
      workspaceName: portfolio.workspaceName,
      className: portfolio.className,
      semesterLabel: portfolio.semesterLabel,
      submissionTitle: portfolio.submissionTitle,
      workspaceId: portfolio.workspaceId,
      assignmentId: portfolio.assignmentId,
      groupId: portfolio.groupId,
      submittedById: portfolio.submittedById,
    })
    .from(portfolio)
    .where(where)
    .orderBy(order)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const portfolioIds = items.map((item) => item.id);
  const countRows =
    portfolioIds.length > 0
      ? await db
          .select({
            portfolioId: portfolioContributor.portfolioId,
            value: count(),
          })
          .from(portfolioContributor)
          .where(inArray(portfolioContributor.portfolioId, portfolioIds))
          .groupBy(portfolioContributor.portfolioId)
      : [];
  const countMap = new Map(countRows.map((row) => [row.portfolioId, Number(row.value)]));
  const accessMap = await resolveProjectAccessBatch({
    studentId: input.studentId,
    projects: items,
    contributorCounts: countMap,
    source: "lists",
  });
  const enriched = items.map((item) => {
    const access = accessMap.get(item.id)!;
    return {
      id: item.id,
      title: item.title,
      status: item.status,
      updatedAt: item.updatedAt.toISOString(),
      workspaceName: item.workspaceName,
      className: item.className,
      semesterLabel: item.semesterLabel,
      submissionTitle: item.submissionTitle,
      kind: access.kind,
      canEdit: access.canEdit,
      canDelete: access.canDelete,
      accessLabel: access.accessLabel,
      isDetached: access.isDetached,
      submissionHref: access.submissionReachable
        ? `/dashboard/student/workspaces/${item.workspaceId}?tab=submission&submission=${item.assignmentId}&view=groups`
        : null,
    };
  });
  return {
    items: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listLecturerSubmissionProjects(input: {
  workspaceId: string;
  lecturerId: string;
  submissionId: string;
}) {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const rows = await db
    .select({
      id: portfolio.id,
      title: portfolio.title,
      status: portfolio.status,
      updatedAt: portfolio.updatedAt,
      groupName: assignmentGroup.name,
      ownerName: userTable.name,
    })
    .from(portfolio)
    .leftJoin(assignmentGroup, eq(assignmentGroup.id, portfolio.groupId))
    .innerJoin(userTable, eq(userTable.id, portfolio.submittedById))
    .where(and(eq(portfolio.assignmentId, input.submissionId), eq(portfolio.workspaceId, input.workspaceId)))
    .orderBy(desc(portfolio.updatedAt));
  return {
    items: rows.map((row) => ({
      ...row,
      updatedAt: row.updatedAt.toISOString(),
      who: row.groupName ?? row.ownerName,
    })),
    note: "Review and scoring will be added here. Status changes are not available yet.",
  };
}

export async function lecturerSetProjectStatus(input: {
  portfolioId: string;
  lecturerId: string;
  status: "IN_REVIEW" | "NEED_REVISION" | "PUBLISHED" | "TAKEN_DOWN";
  meta: Actor;
}) {
  const [current] = await db.select().from(portfolio).where(eq(portfolio.id, input.portfolioId)).limit(1);
  if (!current?.workspaceId) throw new NotFoundError("Project not found");
  await loadOwnedWorkspace(current.workspaceId, input.lecturerId);
  await db
    .update(portfolio)
    .set({
      status: input.status,
      updatedAt: new Date(),
      ...(input.status === "PUBLISHED" ? { publishedAt: new Date(), verifiedById: input.lecturerId, verifiedAt: new Date() } : {}),
    })
    .where(eq(portfolio.id, current.id));
  await createAuditLog({
    actorId: input.meta.actorId,
    action: "project.status",
    entityType: "portfolio",
    entityId: current.id,
    metadata: { status: input.status },
    ipAddress: input.meta.ipAddress,
    userAgent: input.meta.userAgent,
  });
}
