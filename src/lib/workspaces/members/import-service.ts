import "server-only";

import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

import { getServerEnv } from "@/config/env";
import { db } from "@/db";
import { account, user as userTable } from "@/db/schema/auth";
import { studentProfile } from "@/db/schema/profiles";
import {
  workspace,
  workspaceImportJob,
  workspaceImportJobItem,
  workspaceMember,
  type WorkspaceImportItemPayload,
} from "@/db/schema/workspaces";
import { createAuditLog } from "@/lib/audit";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/api/errors";
import { resolveDirectoryLabels } from "@/lib/directory/service";
import { logger } from "@/lib/logger";
import { enqueueImportJob } from "@/lib/queues";
import {
  deleteWorkspaceImportFile,
  generateUnusablePassword,
  uploadWorkspaceImportFile,
} from "@/lib/workspaces/import-storage";
import {
  buildMembersTemplateBuffer,
  loadActiveBatchOptions,
  loadActiveMajorOptions,
  parseMembersExcelBuffer,
  revalidateImportItem,
} from "@/lib/workspaces/members/parse-excel";
import {
  createInvitationOutbox,
  issueActivationToken,
  loadLecturerName,
  loadOwnedWorkspace,
  userHasLoggedIn,
} from "@/lib/workspaces/members/service";
import type {
  WorkspaceImportItemRecord,
  WorkspaceImportJobRecord,
} from "@/lib/workspaces/members/types";
import type { WorkspaceImportItemPatch } from "@/lib/workspaces/members/validators";
import { WORKSPACE_IMPORT_MAX_BYTES } from "@/lib/workspaces/members/types";

function mapJob(
  row: typeof workspaceImportJob.$inferSelect,
): WorkspaceImportJobRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    status: row.status,
    fileName: row.fileName,
    rowCount: row.rowCount,
    validCount: row.validCount,
    errorCount: row.errorCount,
    processedCount: row.processedCount,
    committedAt: row.committedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    canCommit:
      row.status === "READY" &&
      row.errorCount === 0 &&
      row.validCount > 0,
  };
}

function mapItem(
  row: typeof workspaceImportJobItem.$inferSelect,
): WorkspaceImportItemRecord {
  return {
    id: row.id,
    jobId: row.jobId,
    rowIndex: row.rowIndex,
    name: row.payload.name,
    nim: row.payload.nim,
    email: row.payload.email,
    majorLabel: row.payload.majorLabel,
    majorValue: row.payload.majorValue,
    batchLabel: row.payload.batchLabel ?? "",
    batchValue: row.payload.batchValue ?? null,
    errors: row.validation.errors,
    warnings: row.validation.warnings,
    matchType: row.validation.matchType,
    status: row.status,
    resolvedUserId: row.resolvedUserId,
    errorMessage: row.errorMessage,
  };
}

export async function downloadMembersTemplate(): Promise<{
  buffer: Buffer;
  fileName: string;
}> {
  const buffer = await buildMembersTemplateBuffer();
  return {
    buffer,
    fileName: "inkcuba-student-participants.xlsx",
  };
}

export async function createImportJobFromUpload(input: {
  workspaceId: string;
  lecturerId: string;
  fileName: string;
  buffer: Buffer;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<WorkspaceImportJobRecord> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);

  if (input.buffer.byteLength > WORKSPACE_IMPORT_MAX_BYTES) {
    throw new ValidationError("Excel file must be 5MB or smaller");
  }

  const lower = input.fileName.toLowerCase();
  if (!lower.endsWith(".xlsx")) {
    throw new ValidationError("Only .xlsx Excel files are supported");
  }

  // Cancel previous READY/UPLOADED jobs for this workspace
  const stale = await db
    .select()
    .from(workspaceImportJob)
    .where(
      and(
        eq(workspaceImportJob.workspaceId, input.workspaceId),
        inArray(workspaceImportJob.status, [
          "UPLOADED",
          "PARSING",
          "READY",
        ]),
      ),
    );

  for (const job of stale) {
    await deleteWorkspaceImportFile(job.fileKey);
    await db
      .update(workspaceImportJob)
      .set({ status: "CANCELLED" })
      .where(eq(workspaceImportJob.id, job.id));
  }

  const jobId = crypto.randomUUID();
  const uploaded = await uploadWorkspaceImportFile({
    workspaceId: input.workspaceId,
    jobId,
    buffer: input.buffer,
    fileName: input.fileName,
  });

  await db.insert(workspaceImportJob).values({
    id: jobId,
    workspaceId: input.workspaceId,
    lecturerId: input.lecturerId,
    status: "PARSING",
    fileKey: uploaded.key,
    fileName: input.fileName,
    fileSha256: uploaded.sha256,
  });

  try {
    const parsed = await parseMembersExcelBuffer(
      input.buffer,
      input.workspaceId,
    );

    if (parsed.length === 0) {
      throw new ValidationError("No data rows found in the Excel file");
    }

    const env = getServerEnv();
    if (parsed.length > env.WORKSPACE_IMPORT_MAX_ROWS) {
      throw new ValidationError(
        `Too many rows (max ${env.WORKSPACE_IMPORT_MAX_ROWS})`,
      );
    }

    await db.insert(workspaceImportJobItem).values(
      parsed.map((row) => ({
        id: crypto.randomUUID(),
        jobId,
        rowIndex: row.rowIndex,
        payload: row.payload,
        validation: row.validation,
        resolvedUserId: row.resolvedUserId,
        status: "PENDING" as const,
      })),
    );

    const errorCount = parsed.filter(
      (r) => r.validation.errors.length > 0,
    ).length;
    const validCount = parsed.length - errorCount;

    await db
      .update(workspaceImportJob)
      .set({
        status: "READY",
        rowCount: parsed.length,
        validCount,
        errorCount,
      })
      .where(eq(workspaceImportJob.id, jobId));
  } catch (error) {
    await db
      .update(workspaceImportJob)
      .set({
        status: "FAILED",
        metadata: {
          error:
            error instanceof Error ? error.message : "Failed to parse Excel",
        },
      })
      .where(eq(workspaceImportJob.id, jobId));
    throw error instanceof ValidationError
      ? error
      : new ValidationError(
          error instanceof Error ? error.message : "Failed to parse Excel",
        );
  }

  await createAuditLog({
    actorId: input.lecturerId,
    action: "workspace_member.import_upload",
    entityType: "workspace",
    entityId: input.workspaceId,
    metadata: { jobId },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return getImportJob({
    workspaceId: input.workspaceId,
    lecturerId: input.lecturerId,
    jobId,
  });
}

export async function getImportJob(input: {
  workspaceId: string;
  lecturerId: string;
  jobId: string;
}): Promise<WorkspaceImportJobRecord> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const rows = await db
    .select()
    .from(workspaceImportJob)
    .where(
      and(
        eq(workspaceImportJob.id, input.jobId),
        eq(workspaceImportJob.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Import job not found");
  return mapJob(rows[0]);
}

export async function listImportJobItems(input: {
  workspaceId: string;
  lecturerId: string;
  jobId: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  job: WorkspaceImportJobRecord;
  items: WorkspaceImportItemRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const job = await getImportJob(input);
  const pageSize = input.pageSize ?? 50;
  const page = input.page ?? 1;

  const [totalRow] = await db
    .select({ total: count() })
    .from(workspaceImportJobItem)
    .where(eq(workspaceImportJobItem.jobId, input.jobId));

  const total = totalRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const items = await db
    .select()
    .from(workspaceImportJobItem)
    .where(eq(workspaceImportJobItem.jobId, input.jobId))
    .orderBy(asc(workspaceImportJobItem.rowIndex))
    .limit(pageSize)
    .offset((safePage - 1) * pageSize);

  return {
    job,
    items: items.map(mapItem),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function patchImportJobItem(input: {
  workspaceId: string;
  lecturerId: string;
  jobId: string;
  itemId: string;
  patch: WorkspaceImportItemPatch;
}): Promise<WorkspaceImportItemRecord> {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);

  const jobRows = await db
    .select()
    .from(workspaceImportJob)
    .where(
      and(
        eq(workspaceImportJob.id, input.jobId),
        eq(workspaceImportJob.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);
  const job = jobRows[0];
  if (!job) throw new NotFoundError("Import job not found");
  if (job.status !== "READY") {
    throw new ConflictError("Only READY import jobs can be edited");
  }

  const itemRows = await db
    .select()
    .from(workspaceImportJobItem)
    .where(
      and(
        eq(workspaceImportJobItem.id, input.itemId),
        eq(workspaceImportJobItem.jobId, input.jobId),
      ),
    )
    .limit(1);
  const item = itemRows[0];
  if (!item) throw new NotFoundError("Import row not found");

  const majors = await loadActiveMajorOptions();
  const batches = await loadActiveBatchOptions();
  const nextPayload: WorkspaceImportItemPayload = {
    ...item.payload,
    batchLabel: item.payload.batchLabel ?? "",
    batchValue: item.payload.batchValue ?? null,
    ...(input.patch.name !== undefined ? { name: input.patch.name } : {}),
    ...(input.patch.nim !== undefined ? { nim: input.patch.nim } : {}),
    ...(input.patch.email !== undefined
      ? { email: input.patch.email.toLowerCase() }
      : {}),
    ...(input.patch.majorLabel !== undefined
      ? { majorLabel: input.patch.majorLabel }
      : {}),
    ...(input.patch.batchLabel !== undefined
      ? { batchLabel: input.patch.batchLabel }
      : {}),
  };

  const majorMatch = majors.find(
    (m) =>
      m.label.trim().toLowerCase() ===
      nextPayload.majorLabel.trim().toLowerCase(),
  );
  nextPayload.majorValue = majorMatch?.value ?? null;

  const batchMatch = batches.find(
    (b) =>
      b.label.trim().toLowerCase() ===
      nextPayload.batchLabel.trim().toLowerCase(),
  );
  nextPayload.batchValue = batchMatch?.value ?? null;

  const allItems = await db
    .select()
    .from(workspaceImportJobItem)
    .where(eq(workspaceImportJobItem.jobId, input.jobId));

  const seenEmails = new Set<string>();
  const seenNims = new Set<string>();
  for (const other of allItems) {
    if (other.id === item.id) continue;
    seenEmails.add(other.payload.email.toLowerCase());
    seenNims.add(other.payload.nim.toLowerCase());
  }

  const memberRows = await db
    .select({
      email: userTable.email,
      nim: userTable.nim,
    })
    .from(workspaceMember)
    .innerJoin(userTable, eq(workspaceMember.userId, userTable.id))
    .where(
      and(
        eq(workspaceMember.workspaceId, input.workspaceId),
        ne(workspaceMember.status, "REMOVED"),
      ),
    );

  const students = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      nim: userTable.nim,
    })
    .from(userTable)
    .where(eq(userTable.role, "STUDENT"));

  const validation = revalidateImportItem(nextPayload, majors, batches, {
    seenEmails,
    seenNims,
    memberEmails: new Set(memberRows.map((m) => m.email.toLowerCase())),
    memberNims: new Set(
      memberRows
        .map((m) => m.nim?.toLowerCase())
        .filter((v): v is string => Boolean(v)),
    ),
    userByEmail: new Map(students.map((s) => [s.email.toLowerCase(), s])),
    userByNim: new Map(
      students
        .filter((s) => s.nim)
        .map((s) => [s.nim!.toLowerCase(), s]),
    ),
  });

  await db
    .update(workspaceImportJobItem)
    .set({ payload: nextPayload, validation })
    .where(eq(workspaceImportJobItem.id, item.id));

  const refreshed = await db
    .select()
    .from(workspaceImportJobItem)
    .where(eq(workspaceImportJobItem.jobId, input.jobId));

  const errorCount = refreshed.filter(
    (r) => r.validation.errors.length > 0,
  ).length;
  const validCount = refreshed.length - errorCount;

  await db
    .update(workspaceImportJob)
    .set({
      rowCount: refreshed.length,
      validCount,
      errorCount,
    })
    .where(eq(workspaceImportJob.id, input.jobId));

  const updated = await db
    .select()
    .from(workspaceImportJobItem)
    .where(eq(workspaceImportJobItem.id, item.id))
    .limit(1);

  return mapItem(updated[0]!);
}

export async function commitImportJob(input: {
  workspaceId: string;
  lecturerId: string;
  jobId: string;
  idempotencyKey?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<WorkspaceImportJobRecord> {
  const ws = await loadOwnedWorkspace(input.workspaceId, input.lecturerId);

  const rows = await db
    .select()
    .from(workspaceImportJob)
    .where(
      and(
        eq(workspaceImportJob.id, input.jobId),
        eq(workspaceImportJob.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);

  const job = rows[0];
  if (!job) throw new NotFoundError("Import job not found");

  if (job.status === "COMMITTING" || job.status === "COMPLETED") {
    return mapJob(job);
  }

  if (job.status !== "READY") {
    throw new ConflictError("Import job is not ready to commit");
  }

  if (job.errorCount > 0) {
    throw new ValidationError(
      "Fix all validation errors in the preview before committing",
    );
  }

  if (job.validCount === 0) {
    throw new ValidationError("No valid rows to commit");
  }

  // Concurrency: only one COMMITTING job per workspace
  const committing = await db
    .select({ id: workspaceImportJob.id })
    .from(workspaceImportJob)
    .where(
      and(
        eq(workspaceImportJob.workspaceId, input.workspaceId),
        eq(workspaceImportJob.status, "COMMITTING"),
      ),
    )
    .limit(1);

  if (committing[0]) {
    throw new ConflictError(
      "Another import is already committing for this workspace",
    );
  }

  await db
    .update(workspaceImportJob)
    .set({
      status: "COMMITTING",
      idempotencyKey: input.idempotencyKey ?? job.idempotencyKey,
      processedCount: 0,
    })
    .where(eq(workspaceImportJob.id, job.id));

  await enqueueImportJob("commit-import", {
    jobId: job.id,
    workspaceId: ws.id,
    lecturerId: input.lecturerId,
  });

  await createAuditLog({
    actorId: input.lecturerId,
    action: "workspace_member.import_commit",
    entityType: "workspace",
    entityId: input.workspaceId,
    metadata: { jobId: job.id },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return getImportJob(input);
}

/** Worker: process commit-import in chunks. */
export async function processImportCommitJob(input: {
  jobId: string;
  workspaceId: string;
  lecturerId: string;
}): Promise<void> {
  const env = getServerEnv();
  const chunk = env.WORKSPACE_IMPORT_CHUNK;

  const jobRows = await db
    .select()
    .from(workspaceImportJob)
    .where(eq(workspaceImportJob.id, input.jobId))
    .limit(1);
  const job = jobRows[0];
  if (!job || job.status !== "COMMITTING") return;

  const wsList = await db
    .select()
    .from(workspace)
    .where(eq(workspace.id, input.workspaceId))
    .limit(1);
  const ws = wsList[0];
  if (!ws) {
    await db
      .update(workspaceImportJob)
      .set({ status: "FAILED", metadata: { error: "Workspace missing" } })
      .where(eq(workspaceImportJob.id, job.id));
    return;
  }

  const lecturerName = await loadLecturerName(input.lecturerId);
  const semesterLabels = await resolveDirectoryLabels([
    { category: "semester", value: ws.semester },
  ]);

  const pending = await db
    .select()
    .from(workspaceImportJobItem)
    .where(
      and(
        eq(workspaceImportJobItem.jobId, job.id),
        eq(workspaceImportJobItem.status, "PENDING"),
      ),
    )
    .orderBy(asc(workspaceImportJobItem.rowIndex))
    .limit(chunk);

  if (pending.length === 0) {
    await db
      .update(workspaceImportJob)
      .set({
        status: "COMPLETED",
        committedAt: new Date(),
      })
      .where(eq(workspaceImportJob.id, job.id));
    await deleteWorkspaceImportFile(job.fileKey);
    logger.info({ jobId: job.id }, "Workspace import commit completed");
    return;
  }

  for (const item of pending) {
    try {
      if (
        item.validation.matchType === "ALREADY_MEMBER" ||
        item.validation.errors.length > 0
      ) {
        await db
          .update(workspaceImportJobItem)
          .set({ status: "SKIPPED" })
          .where(eq(workspaceImportJobItem.id, item.id));
        continue;
      }

      const email = item.payload.email.toLowerCase();
      let userRows = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, email))
        .limit(1);

      let user = userRows[0];
      let isNew = false;

      if (!user) {
        const byNim = await db
          .select()
          .from(userTable)
          .where(eq(userTable.nim, item.payload.nim))
          .limit(1);
        user = byNim[0];
      }

      if (!user) {
        isNew = true;
        const userId = crypto.randomUUID();
        const hashed = await hashPassword(generateUnusablePassword());
        await db.insert(userTable).values({
          id: userId,
          name: item.payload.name,
          email,
          emailVerified: true,
          role: "STUDENT",
          nim: item.payload.nim,
          isActive: true,
        });
        await db.insert(account).values({
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: hashed,
        });
        await db.insert(studentProfile).values({
          id: crypto.randomUUID(),
          userId,
          major: item.payload.majorValue,
          batch: item.payload.batchValue,
        });
        userRows = await db
          .select()
          .from(userTable)
          .where(eq(userTable.id, userId))
          .limit(1);
        user = userRows[0]!;
      } else if (item.payload.majorValue || item.payload.batchValue) {
        // Keep Directory-synced profile fields aligned when inviting existing users
        const profileRows = await db
          .select()
          .from(studentProfile)
          .where(eq(studentProfile.userId, user.id))
          .limit(1);
        if (profileRows[0]) {
          await db
            .update(studentProfile)
            .set({
              ...(item.payload.majorValue
                ? { major: item.payload.majorValue }
                : {}),
              ...(item.payload.batchValue
                ? { batch: item.payload.batchValue }
                : {}),
            })
            .where(eq(studentProfile.id, profileRows[0].id));
        } else {
          await db.insert(studentProfile).values({
            id: crypto.randomUUID(),
            userId: user.id,
            major: item.payload.majorValue,
            batch: item.payload.batchValue,
          });
        }
      }

      const hasLogin = isNew ? false : await userHasLoggedIn(user.id);

      const existingMember = await db
        .select()
        .from(workspaceMember)
        .where(
          and(
            eq(workspaceMember.workspaceId, input.workspaceId),
            eq(workspaceMember.userId, user.id),
          ),
        )
        .limit(1);

      let memberId: string;
      const now = new Date();

      if (existingMember[0] && existingMember[0].status !== "REMOVED") {
        memberId = existingMember[0].id;
        await db
          .update(workspaceImportJobItem)
          .set({
            status: "SKIPPED",
            resolvedUserId: user.id,
          })
          .where(eq(workspaceImportJobItem.id, item.id));
        continue;
      }

      if (existingMember[0]?.status === "REMOVED") {
        memberId = existingMember[0].id;
        await db
          .update(workspaceMember)
          .set({
            status: "INVITED",
            source: "EXCEL",
            invitedBy: input.lecturerId,
            invitedAt: now,
            removedAt: null,
          })
          .where(eq(workspaceMember.id, memberId));
      } else {
        memberId = crypto.randomUUID();
        await db.insert(workspaceMember).values({
          id: memberId,
          workspaceId: input.workspaceId,
          userId: user.id,
          status: "INVITED",
          source: "EXCEL",
          invitedBy: input.lecturerId,
          invitedAt: now,
        });
      }

      let template:
        | "INVITE_EXISTING"
        | "INVITE_REGISTERED_NO_LOGIN"
        | "INVITE_ACTIVATE" = "INVITE_EXISTING";
      let activationUrl: string | null = null;
      const base = process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ?? "";

      if (isNew) {
        template = "INVITE_ACTIVATE";
        const issued = await issueActivationToken({
          userId: user.id,
          workspaceId: input.workspaceId,
          memberId,
          purpose: "INVITE_ACTIVATE",
        });
        activationUrl = issued.url;
      } else if (!hasLogin) {
        template = "INVITE_REGISTERED_NO_LOGIN";
        activationUrl = `${base}/auth/forgot-password`;
      } else {
        template = "INVITE_EXISTING";
        activationUrl = `${base}/dashboard/student`;
      }

      await createInvitationOutbox({
        workspaceId: input.workspaceId,
        memberId,
        userId: user.id,
        recipient: user.email,
        template,
        jobId: job.id,
        workspaceName: ws.name,
        lecturerName,
        className: ws.className,
        semesterLabel: semesterLabels.semester ?? ws.semester,
        activationUrl,
      });

      await db
        .update(workspaceImportJobItem)
        .set({
          status: "SUCCESS",
          resolvedUserId: user.id,
        })
        .where(eq(workspaceImportJobItem.id, item.id));
    } catch (error) {
      logger.error(
        { err: error, itemId: item.id, jobId: job.id },
        "Import item commit failed",
      );
      await db
        .update(workspaceImportJobItem)
        .set({
          status: "FAILED",
          errorMessage:
            error instanceof Error ? error.message : "Commit failed",
        })
        .where(eq(workspaceImportJobItem.id, item.id));
    }
  }

  const [processed] = await db
    .select({ total: count() })
    .from(workspaceImportJobItem)
    .where(
      and(
        eq(workspaceImportJobItem.jobId, job.id),
        inArray(workspaceImportJobItem.status, [
          "SUCCESS",
          "SKIPPED",
          "FAILED",
        ]),
      ),
    );

  await db
    .update(workspaceImportJob)
    .set({ processedCount: processed?.total ?? 0 })
    .where(eq(workspaceImportJob.id, job.id));

  // Re-enqueue until done
  const remaining = await db
    .select({ id: workspaceImportJobItem.id })
    .from(workspaceImportJobItem)
    .where(
      and(
        eq(workspaceImportJobItem.jobId, job.id),
        eq(workspaceImportJobItem.status, "PENDING"),
      ),
    )
    .limit(1);

  if (remaining[0]) {
    await enqueueImportJob("commit-import", {
      jobId: job.id,
      workspaceId: input.workspaceId,
      lecturerId: input.lecturerId,
    });
  } else {
    await db
      .update(workspaceImportJob)
      .set({
        status: "COMPLETED",
        committedAt: new Date(),
      })
      .where(eq(workspaceImportJob.id, job.id));
    await deleteWorkspaceImportFile(job.fileKey);
  }
}
