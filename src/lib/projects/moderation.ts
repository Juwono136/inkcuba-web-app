import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import {
  portfolio,
  portfolioContributor,
  portfolioDocument,
  portfolioEvent,
  portfolioImage,
  portfolioLink,
  portfolioMemberComponentScore,
  portfolioMemberScore,
  portfolioScoreComponent,
  portfolioScoreSheet,
  portfolioVideo,
} from "@/db/schema/portfolios";
import {
  assignment,
  assignmentGroup,
  assignmentGroupMember,
} from "@/db/schema/workspaces";
import { createAuditLog } from "@/lib/audit";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/api/errors";
import {
  dispatchProjectEmailOutboxes,
  enqueueProjectNotification,
} from "@/lib/email/services/project-notify";
import { getRedisClient } from "@/lib/redis";
import { siteConfig } from "@/config/site";
import { recordPortfolioEvent } from "@/lib/projects/events";
import { buildJourneyStageTimestamps } from "@/lib/projects/journey";
import { PROJECT_MAX_REVISIONS, type ProjectStatus } from "@/lib/projects/limits";
import { assertRubricWeightsComplete, componentMaxMap } from "@/lib/projects/rubric";
import {
  computeFinalMemberGrade,
  loadAssignmentRubric,
  loadLatestScoreSheet,
  loadNeighborProjectIds,
} from "@/lib/projects/score-sheet";
import { plainProjectText, sanitizeProjectFeedback } from "@/lib/projects/sanitize";
import type {
  LecturerModerateInput,
  LecturerProjectListQuery,
  LecturerScoringSubmissionListQuery,
} from "@/lib/projects/validators";
import { SCORING_PROJECT_STATUSES } from "@/lib/projects/validators";
import { toMediaProxyUrl } from "@/lib/workspaces/sanitize-description";
import { submissionWindowState } from "@/lib/workspaces/submissions/types";
import { loadOwnedWorkspace } from "@/lib/workspaces/submissions/access";

type Actor = { actorId: string; ipAddress?: string | null; userAgent?: string | null };

const MODE_LABEL = {
  INDIVIDUAL: "Individual",
  GROUP_ONLY: "Group only",
  GROUP_AND_INDIVIDUAL: "Group + individual",
} as const;

function imageUrl(image: string | null): string | null {
  if (!image) return null;
  if (image.startsWith("http") || image.startsWith("/")) return image;
  return toMediaProxyUrl(image);
}

function appBaseUrl() {
  return (siteConfig.appUrl || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function formatDeadline(closesAt: Date | null, scheduleMode: string) {
  if (scheduleMode === "OPEN" || !closesAt) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(closesAt);
}

function assertFresh(current: Date, expected?: string) {
  if (!expected) return;
  const incoming = new Date(expected);
  if (Number.isNaN(incoming.getTime()) || incoming.getTime() !== current.getTime()) {
    throw new ConflictError("This project was updated by someone else. Reload and try again.");
  }
}

async function loadContributorEmails(portfolioId: string) {
  const rows = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(portfolioContributor)
    .innerJoin(userTable, eq(userTable.id, portfolioContributor.userId))
    .where(eq(portfolioContributor.portfolioId, portfolioId));
  const people = rows.filter((row) => Boolean(row.email));
  if (people.length > 0) return people;

  // Fallback for older rows that may lack contributor records.
  const [owner] = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(portfolio)
    .innerJoin(userTable, eq(userTable.id, portfolio.submittedById))
    .where(eq(portfolio.id, portfolioId))
    .limit(1);
  return owner?.email ? [owner] : [];
}

export async function startLecturerReview(input: {
  workspaceId: string;
  portfolioId: string;
  lecturerId: string;
  meta: Actor;
}) {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(portfolio)
      .where(and(eq(portfolio.id, input.portfolioId), eq(portfolio.workspaceId, input.workspaceId)))
      .for("update")
      .limit(1);
    if (!current) throw new NotFoundError("Project not found");
    if (current.status !== "SUBMITTED" && current.status !== "REVISED") {
      return { id: current.id, status: current.status as ProjectStatus, started: false };
    }
    await tx
      .update(portfolio)
      .set({ status: "IN_REVIEW", updatedAt: new Date() })
      .where(eq(portfolio.id, current.id));
    await recordPortfolioEvent(tx, {
      portfolioId: current.id,
      actorId: input.lecturerId,
      actorRole: "LECTURER",
      eventType: "REVIEW_STARTED",
      fromStatus: current.status,
      toStatus: "IN_REVIEW",
      message: "The lecturer opened this project for moderation.",
    });
    await createAuditLog({
      actorId: input.meta.actorId,
      action: "project.review_start",
      entityType: "portfolio",
      entityId: current.id,
      ipAddress: input.meta.ipAddress,
      userAgent: input.meta.userAgent,
    });
    return { id: current.id, status: "IN_REVIEW" as const, started: true };
  });
}

export async function lecturerModerateProject(input: {
  workspaceId: string;
  portfolioId: string;
  lecturerId: string;
  data: LecturerModerateInput;
  idempotencyKey?: string | null;
  meta: Actor;
}) {
  const cacheKey = input.idempotencyKey
    ? `project:moderate:${input.lecturerId}:${input.portfolioId}:${input.idempotencyKey}`
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
          throw new ConflictError("This moderation is already running. Wait a moment, then try again.");
        }
      }
      throw new ConflictError("This moderation is already running. Wait a moment, then try again.");
    }
  }

  try {
    const emailOutboxIds: string[] = [];
    const result = await db.transaction(async (tx) => {
      await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
      const [current] = await tx
        .select()
        .from(portfolio)
        .where(and(eq(portfolio.id, input.portfolioId), eq(portfolio.workspaceId, input.workspaceId)))
        .for("update")
        .limit(1);
      if (!current) throw new NotFoundError("Project not found");
      assertFresh(current.updatedAt, input.data.expectedUpdatedAt);

      if (!current.assignmentId) {
        throw new ValidationError("This submission is no longer available");
      }
      const [slot] = await tx
        .select()
        .from(assignment)
        .where(eq(assignment.id, current.assignmentId))
        .limit(1);
      if (!slot || slot.workspaceId !== input.workspaceId) {
        throw new NotFoundError("Submission not found");
      }
      if (slot.status !== "ACTIVE") {
        throw new ValidationError("Moderation is only available while the submission is Active");
      }

      const moderatable = ["SUBMITTED", "IN_REVIEW", "REVISED"];
      if (!moderatable.includes(current.status)) {
        throw new ValidationError("This project cannot be moderated from its current status");
      }

      const [revisionCountRow] = await tx
        .select({ value: count() })
        .from(portfolioEvent)
        .where(
          and(
            eq(portfolioEvent.portfolioId, current.id),
            eq(portfolioEvent.eventType, "REVISION_REQUESTED"),
          ),
        );
      const revisionCount = Number(revisionCountRow?.value ?? 0);

      // REVISION: feedback only — no rubric scoring sheet.
      if (input.data.decision === "REVISION") {
        if (revisionCount >= PROJECT_MAX_REVISIONS) {
          throw new ValidationError(
            `This project already used all ${PROJECT_MAX_REVISIONS} revision rounds. Publish with a score instead.`,
          );
        }
        const feedback = sanitizeProjectFeedback(input.data.feedback, { required: true });
        const feedbackPlain = feedback ? plainProjectText(feedback) : null;
        await tx
          .update(portfolio)
          .set({
            status: "NEED_REVISION",
            feedback,
            grade: null,
            updatedAt: new Date(),
          })
          .where(eq(portfolio.id, current.id));
        await recordPortfolioEvent(tx, {
          portfolioId: current.id,
          actorId: input.lecturerId,
          actorRole: "LECTURER",
          eventType: "REVISION_REQUESTED",
          fromStatus: current.status,
          toStatus: "NEED_REVISION",
          feedback,
          message: `The lecturer requested a revision (${revisionCount + 1} of ${PROJECT_MAX_REVISIONS}). Editing is open again until the submission deadline.`,
          metadata: {
            decision: "REVISION",
            revisionRound: revisionCount + 1,
            maxRevisions: PROJECT_MAX_REVISIONS,
            scoringSheetCreated: false,
          },
        });
        await createAuditLog({
          actorId: input.meta.actorId,
          action: "project.revision",
          entityType: "portfolio",
          entityId: current.id,
          metadata: {
            decision: "REVISION",
            revisionCount: revisionCount + 1,
            maxRevisions: PROJECT_MAX_REVISIONS,
          },
          ipAddress: input.meta.ipAddress,
          userAgent: input.meta.userAgent,
        });

        const recipients = await loadContributorEmails(current.id);
        const deadlineLabel = formatDeadline(slot.closesAt, slot.scheduleMode);
        for (const person of recipients) {
          emailOutboxIds.push(
            await enqueueProjectNotification(
              tx,
              {
                portfolioId: current.id,
                workspaceId: input.workspaceId,
                recipient: person.email,
                template: "PROJECT_REVISION_REQUESTED",
                payload: {
                  recipientName: person.name,
                  projectTitle: current.title,
                  workspaceName: current.workspaceName ?? "Workspace",
                  submissionTitle: current.submissionTitle ?? slot.title,
                  ctaUrl: `${appBaseUrl()}/dashboard/student/projects/${current.id}?source=lists`,
                  feedback: feedbackPlain,
                  deadlineLabel,
                  audience: "student",
                  journeyStage: "Revision requested",
                  scoringSheetAvailable: false,
                  revisionRound: revisionCount + 1,
                  maxRevisions: PROJECT_MAX_REVISIONS,
                },
              },
              { dispatch: false },
            ),
          );
        }
        return { id: current.id, status: "NEED_REVISION" as const };
      }

      // PUBLISH: require complete rubric scores.
      const scoringMode = input.data.scoringMode;
      if (!scoringMode) {
        throw new ValidationError("Choose a scoring mode to publish");
      }
      const isGroup = Boolean(current.groupId);
      if (!isGroup && scoringMode !== "INDIVIDUAL") {
        throw new ValidationError("Individual projects must use individual scoring");
      }
      if (isGroup && scoringMode === "INDIVIDUAL") {
        throw new ValidationError("Choose group only or group + individual for group projects");
      }

      const rubric = await loadAssignmentRubric(slot.id, slot.maxScore);
      assertRubricWeightsComplete(rubric);
      if (rubric.length === 0) {
        throw new ValidationError("Define a complete assessment rubric before publishing");
      }

      const maxById = componentMaxMap(rubric, slot.maxScore);
      const scoreById = new Map(
        (input.data.componentScores ?? []).map((row) => [row.rubricComponentId, row.score]),
      );
      if (scoreById.size !== rubric.length) {
        throw new ValidationError("Score every rubric component exactly once");
      }
      let groupTotal = 0;
      const scoredComponents: Array<{
        rubricComponentId: string;
        score: number;
        maxPoints: number;
        weightPercent: number;
        componentName: string;
        componentDescription: string | null;
      }> = [];
      for (const component of rubric) {
        const score = scoreById.get(component.id);
        const maxPoints = maxById.get(component.id) ?? 0;
        if (score == null || !Number.isInteger(score) || score < 0 || score > maxPoints) {
          throw new ValidationError(
            `Enter a whole-number score from 0 to ${maxPoints} for “${component.name}”`,
          );
        }
        groupTotal += score;
        scoredComponents.push({
          rubricComponentId: component.id,
          score,
          maxPoints,
          weightPercent: component.weightPercent,
          componentName: component.name,
          componentDescription: component.description,
        });
      }
      if (groupTotal > slot.maxScore) {
        throw new ValidationError(`Component scores cannot exceed ${slot.maxScore}`);
      }

      const groupPercent =
        scoringMode === "GROUP_AND_INDIVIDUAL" ? (input.data.groupPercent ?? 0) : 100;
      const individualPercent =
        scoringMode === "GROUP_AND_INDIVIDUAL" ? (input.data.individualPercent ?? 0) : 0;
      if (scoringMode === "GROUP_AND_INDIVIDUAL" && groupPercent + individualPercent !== 100) {
        throw new ValidationError("Group and individual percents must total 100%");
      }

      const memberIdRows = current.groupId
        ? await tx
            .select({ userId: assignmentGroupMember.userId })
            .from(assignmentGroupMember)
            .where(eq(assignmentGroupMember.groupId, current.groupId))
        : await tx
            .select({ userId: portfolioContributor.userId })
            .from(portfolioContributor)
            .where(eq(portfolioContributor.portfolioId, current.id));
      const memberIds = memberIdRows.map((row) => row.userId);
      if (memberIds.length === 0 && current.submittedById) {
        memberIds.push(current.submittedById);
      }

      const memberInputById = new Map(
        (input.data.memberScores ?? []).map((row) => [row.userId, row]),
      );

      type MemberComponentRow = {
        userId: string;
        rubricComponentId: string;
        score: number;
        maxPoints: number;
        weightPercent: number;
        componentName: string;
        componentDescription: string | null;
      };
      const memberComponentRows: MemberComponentRow[] = [];

      if (scoringMode === "GROUP_AND_INDIVIDUAL") {
        for (const userId of memberIds) {
          const row = memberInputById.get(userId);
          if (!row?.componentScores?.length) {
            throw new ValidationError(
              "Score every rubric component for each group member before publishing",
            );
          }
          const memberScoreById = new Map(
            row.componentScores.map((item) => [item.rubricComponentId, item.score]),
          );
          if (memberScoreById.size !== rubric.length) {
            throw new ValidationError(
              "Score every rubric component exactly once for each group member",
            );
          }
          let individualTotal = 0;
          for (const component of rubric) {
            const score = memberScoreById.get(component.id);
            const maxPoints = maxById.get(component.id) ?? 0;
            if (score == null || !Number.isInteger(score) || score < 0 || score > maxPoints) {
              throw new ValidationError(
                `Enter a whole-number score from 0 to ${maxPoints} for “${component.name}” on each member`,
              );
            }
            individualTotal += score;
            memberComponentRows.push({
              userId,
              rubricComponentId: component.id,
              score,
              maxPoints,
              weightPercent: component.weightPercent,
              componentName: component.name,
              componentDescription: component.description,
            });
          }
          if (individualTotal > slot.maxScore) {
            throw new ValidationError(
              `A member’s individual component scores cannot exceed ${slot.maxScore}`,
            );
          }
        }
      }

      const feedback = sanitizeProjectFeedback(input.data.feedback);
      const feedbackPlain = feedback ? plainProjectText(feedback) : null;

      const individualTotalByUser = new Map<string, number>();
      for (const row of memberComponentRows) {
        individualTotalByUser.set(
          row.userId,
          (individualTotalByUser.get(row.userId) ?? 0) + row.score,
        );
      }

      const memberNameRows =
        memberIds.length > 0
          ? await tx
              .select({ id: userTable.id, name: userTable.name })
              .from(userTable)
              .where(inArray(userTable.id, memberIds))
          : [];
      const memberNameById = new Map(memberNameRows.map((row) => [row.id, row.name]));

      const memberRows = memberIds.map((userId) => {
        const individualScore =
          scoringMode === "GROUP_AND_INDIVIDUAL"
            ? (individualTotalByUser.get(userId) ?? 0)
            : null;
        const finalGrade = computeFinalMemberGrade({
          scoringMode,
          groupTotal,
          individualScore,
          groupPercent,
          individualPercent,
          maxScore: slot.maxScore,
        });
        return {
          userId,
          name: memberNameById.get(userId) ?? "Member",
          individualScore,
          finalGrade,
        };
      });

      const denormalizedGrade = memberRows[0]?.finalGrade ?? groupTotal;
      const sheetFinal = scoringMode === "GROUP_AND_INDIVIDUAL" ? null : groupTotal;

      const sheetId = crypto.randomUUID();
      await tx.insert(portfolioScoreSheet).values({
        id: sheetId,
        portfolioId: current.id,
        assignmentId: slot.id,
        decision: "PUBLISH",
        scoringMode,
        groupPercent,
        individualPercent,
        groupTotal,
        finalGrade: sheetFinal ?? denormalizedGrade,
        groupFeedback: feedback,
        createdById: input.lecturerId,
      });
      await tx.insert(portfolioScoreComponent).values(
        scoredComponents.map((row) => ({
          id: crypto.randomUUID(),
          sheetId,
          ...row,
        })),
      );
      if (memberRows.length > 0) {
        await tx.insert(portfolioMemberScore).values(
          memberRows.map((row) => ({
            id: crypto.randomUUID(),
            sheetId,
            userId: row.userId,
            individualScore: row.individualScore,
            finalGrade: row.finalGrade,
            notes: null,
          })),
        );
      }
      if (memberComponentRows.length > 0) {
        await tx.insert(portfolioMemberComponentScore).values(
          memberComponentRows.map((row) => ({
            id: crypto.randomUUID(),
            sheetId,
            ...row,
          })),
        );
      }

      const grade = denormalizedGrade;
      const now = new Date();
      await tx
        .update(portfolio)
        .set({
          status: "PUBLISHED",
          grade,
          feedback,
          publishedAt: now,
          verifiedById: input.lecturerId,
          verifiedAt: now,
          updatedAt: now,
        })
        .where(eq(portfolio.id, current.id));
      await recordPortfolioEvent(tx, {
        portfolioId: current.id,
        actorId: input.lecturerId,
        actorRole: "LECTURER",
        eventType: "PUBLISHED",
        fromStatus: current.status,
        toStatus: "PUBLISHED",
        grade,
        feedback,
        message:
          scoringMode === "GROUP_AND_INDIVIDUAL"
            ? `The lecturer published scores (${MODE_LABEL[scoringMode]} · group ${groupTotal}/${slot.maxScore}, split ${groupPercent}% / ${individualPercent}%).`
            : `The lecturer published this project with a score of ${grade}/${slot.maxScore} (${MODE_LABEL[scoringMode]}).`,
        metadata: {
          decision: "PUBLISH",
          sheetId,
          scoringMode,
          groupPercent,
          individualPercent,
          groupTotal,
          maxScore: slot.maxScore,
          denormalizedGrade: grade,
          components: scoredComponents.map((row) => ({
            name: row.componentName,
            weightPercent: row.weightPercent,
            maxPoints: row.maxPoints,
            score: row.score,
          })),
          members: memberRows.map((row) => ({
            userId: row.userId,
            name: row.name,
            individualScore: row.individualScore,
            finalGrade: row.finalGrade,
          })),
        },
      });
      await createAuditLog({
        actorId: input.meta.actorId,
        action: "project.publish",
        entityType: "portfolio",
        entityId: current.id,
        metadata: {
          decision: "PUBLISH",
          grade,
          sheetId,
          groupTotal,
          scoringMode,
          groupPercent,
          individualPercent,
          memberCount: memberRows.length,
          componentCount: scoredComponents.length,
        },
        ipAddress: input.meta.ipAddress,
        userAgent: input.meta.userAgent,
      });

      const recipients = await loadContributorEmails(current.id);
      for (const person of recipients) {
        emailOutboxIds.push(
          await enqueueProjectNotification(
            tx,
            {
              portfolioId: current.id,
              workspaceId: input.workspaceId,
              recipient: person.email,
              template: "PROJECT_PUBLISHED",
              payload: {
                recipientName: person.name,
                projectTitle: current.title,
                workspaceName: current.workspaceName ?? "Workspace",
                submissionTitle: current.submissionTitle ?? slot.title,
                ctaUrl: `${appBaseUrl()}/dashboard/student/projects/${current.id}?source=lists`,
                feedback: feedbackPlain,
                grade,
                maxScore: slot.maxScore,
                audience: "student",
                journeyStage: "Published",
                scoringSheetAvailable: true,
              },
            },
            { dispatch: false },
          ),
        );
      }

      const [lecturer] = await tx
        .select({ email: userTable.email, name: userTable.name })
        .from(userTable)
        .where(eq(userTable.id, input.lecturerId))
        .limit(1);
      if (lecturer?.email) {
        emailOutboxIds.push(
          await enqueueProjectNotification(
            tx,
            {
              portfolioId: current.id,
              workspaceId: input.workspaceId,
              recipient: lecturer.email,
              template: "PROJECT_PUBLISHED",
              payload: {
                recipientName: lecturer.name,
                projectTitle: current.title,
                workspaceName: current.workspaceName ?? "Workspace",
                submissionTitle: current.submissionTitle ?? slot.title,
                ctaUrl: `${appBaseUrl()}/dashboard/lecturer/workspaces/${input.workspaceId}?tab=scoring&scoringSubmission=${slot.id}&project=${current.id}`,
                feedback: feedbackPlain,
                grade,
                maxScore: slot.maxScore,
                audience: "lecturer",
                journeyStage: "Published",
                scoringSheetAvailable: true,
              },
            },
            { dispatch: false },
          ),
        );
      }
      return { id: current.id, status: "PUBLISHED" as const };
    });

    await dispatchProjectEmailOutboxes(emailOutboxIds);

    if (cacheKey) {
      try {
        await getRedisClient().set(cacheKey, JSON.stringify(result), "EX", 600);
      } catch {
        // Leave the short lock; moderation already committed.
      }
    }
    return result;
  } catch (error) {
    if (cacheKey) await getRedisClient().del(cacheKey);
    throw error;
  }
}

export { notifyAfterStudentSubmit } from "@/lib/projects/notify-submit";

export async function listLecturerScoringSubmissions(input: {
  workspaceId: string;
  lecturerId: string;
  query: LecturerScoringSubmissionListQuery;
}) {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const filters = [
    eq(assignment.workspaceId, input.workspaceId),
    inArray(assignment.status, ["ACTIVE", "CLOSED"]),
  ];
  if (input.query.type !== "ALL") {
    filters.push(eq(assignment.type, input.query.type));
  }
  if (input.query.q) {
    const safe = input.query.q.replace(/[%_]/g, "");
    if (safe) filters.push(ilike(assignment.title, `%${safe}%`));
  }
  const where = and(...filters);

  const slots = await db
    .select({
      id: assignment.id,
      title: assignment.title,
      type: assignment.type,
      status: assignment.status,
      maxScore: assignment.maxScore,
      scheduleMode: assignment.scheduleMode,
      opensAt: assignment.opensAt,
      closesAt: assignment.closesAt,
      updatedAt: assignment.updatedAt,
    })
    .from(assignment)
    .where(where);

  const slotIds = slots.map((slot) => slot.id);
  const countRows =
    slotIds.length > 0
      ? await db
          .select({
            assignmentId: portfolio.assignmentId,
            status: portfolio.status,
            value: count(),
          })
          .from(portfolio)
          .where(
            and(
              eq(portfolio.workspaceId, input.workspaceId),
              inArray(portfolio.assignmentId, slotIds),
              inArray(portfolio.status, [...SCORING_PROJECT_STATUSES]),
            ),
          )
          .groupBy(portfolio.assignmentId, portfolio.status)
      : [];

  const bySlot = new Map<
    string,
    { awaitingReview: number; needRevision: number; published: number; scoreable: number }
  >();
  for (const row of countRows) {
    if (!row.assignmentId) continue;
    const current = bySlot.get(row.assignmentId) ?? {
      awaitingReview: 0,
      needRevision: 0,
      published: 0,
      scoreable: 0,
    };
    const n = Number(row.value);
    current.scoreable += n;
    if (row.status === "SUBMITTED" || row.status === "IN_REVIEW" || row.status === "REVISED") {
      current.awaitingReview += n;
    } else if (row.status === "NEED_REVISION") {
      current.needRevision += n;
    } else if (row.status === "PUBLISHED") {
      current.published += n;
    }
    bySlot.set(row.assignmentId, current);
  }

  const items = slots.map((slot) => {
    const stats = bySlot.get(slot.id) ?? {
      awaitingReview: 0,
      needRevision: 0,
      published: 0,
      scoreable: 0,
    };
    return {
      id: slot.id,
      title: slot.title,
      type: slot.type,
      status: slot.status,
      maxScore: slot.maxScore,
      scheduleMode: slot.scheduleMode,
      opensAt: slot.opensAt?.toISOString() ?? null,
      closesAt: slot.closesAt?.toISOString() ?? null,
      updatedAt: slot.updatedAt.toISOString(),
      ...stats,
    };
  });

  const dir = input.query.sortDir === "asc" ? 1 : -1;
  items.sort((a, b) => {
    let cmp = 0;
    if (input.query.sortBy === "title") cmp = a.title.localeCompare(b.title);
    else if (input.query.sortBy === "maxScore") cmp = a.maxScore - b.maxScore;
    else if (input.query.sortBy === "awaitingReview") cmp = a.awaitingReview - b.awaitingReview;
    else cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    if (cmp === 0) cmp = a.title.localeCompare(b.title);
    return cmp * dir;
  });

  const total = items.length;
  const pageItems = items.slice(
    (input.query.page - 1) * input.query.pageSize,
    input.query.page * input.query.pageSize,
  );

  return {
    items: pageItems,
    total,
    page: input.query.page,
    pageSize: input.query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.query.pageSize)),
  };
}

export async function listLecturerWorkspaceProjects(input: {
  workspaceId: string;
  lecturerId: string;
  query: LecturerProjectListQuery;
}) {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const filters = [eq(portfolio.workspaceId, input.workspaceId)];
  if (input.query.status === "NEEDS_ATTENTION") {
    filters.push(inArray(portfolio.status, ["SUBMITTED", "IN_REVIEW", "REVISED"]));
  } else if (input.query.status === "ALL") {
    filters.push(inArray(portfolio.status, [...SCORING_PROJECT_STATUSES]));
  } else {
    filters.push(eq(portfolio.status, input.query.status));
  }
  if (input.query.submissionId) {
    filters.push(eq(portfolio.assignmentId, input.query.submissionId));
  }
  if (input.query.q) {
    const safe = input.query.q.replace(/[%_]/g, "");
    if (safe) {
      filters.push(
        or(
          ilike(portfolio.title, `%${safe}%`),
          ilike(portfolio.submissionTitle, `%${safe}%`),
          ilike(userTable.name, `%${safe}%`),
          ilike(assignmentGroup.name, `%${safe}%`),
        )!,
      );
    }
  }
  const where = and(...filters);
  const orderColumn =
    input.query.sortBy === "title"
      ? portfolio.title
      : input.query.sortBy === "status"
        ? portfolio.status
        : portfolio.updatedAt;
  const orderBy = input.query.sortDir === "asc" ? asc(orderColumn) : desc(orderColumn);

  const [totalRow] = await db
    .select({ value: count() })
    .from(portfolio)
    .leftJoin(assignmentGroup, eq(assignmentGroup.id, portfolio.groupId))
    .innerJoin(userTable, eq(userTable.id, portfolio.submittedById))
    .where(where);
  const total = Number(totalRow?.value ?? 0);
  const items = await db
    .select({
      id: portfolio.id,
      title: portfolio.title,
      status: portfolio.status,
      grade: portfolio.grade,
      updatedAt: portfolio.updatedAt,
      assignmentId: portfolio.assignmentId,
      groupId: portfolio.groupId,
      submissionTitle: portfolio.submissionTitle,
      groupName: assignmentGroup.name,
      ownerName: userTable.name,
      maxScore: assignment.maxScore,
      assignmentStatus: assignment.status,
    })
    .from(portfolio)
    .leftJoin(assignmentGroup, eq(assignmentGroup.id, portfolio.groupId))
    .leftJoin(assignment, eq(assignment.id, portfolio.assignmentId))
    .innerJoin(userTable, eq(userTable.id, portfolio.submittedById))
    .where(where)
    .orderBy(orderBy, desc(portfolio.id))
    .limit(input.query.pageSize)
    .offset((input.query.page - 1) * input.query.pageSize);

  const groupIds = [
    ...new Set(items.map((item) => item.groupId).filter((id): id is string => Boolean(id))),
  ];
  const individualIds = items.filter((item) => !item.groupId).map((item) => item.id);

  const [groupPeople, individualPeople] = await Promise.all([
    groupIds.length > 0
      ? db
          .select({
            groupId: assignmentGroupMember.groupId,
            userId: userTable.id,
            name: userTable.name,
            nim: userTable.nim,
            image: userTable.image,
          })
          .from(assignmentGroupMember)
          .innerJoin(userTable, eq(userTable.id, assignmentGroupMember.userId))
          .where(inArray(assignmentGroupMember.groupId, groupIds))
          .orderBy(asc(userTable.name))
      : Promise.resolve([]),
    individualIds.length > 0
      ? db
          .select({
            portfolioId: portfolioContributor.portfolioId,
            userId: userTable.id,
            name: userTable.name,
            nim: userTable.nim,
            image: userTable.image,
          })
          .from(portfolioContributor)
          .innerJoin(userTable, eq(userTable.id, portfolioContributor.userId))
          .where(inArray(portfolioContributor.portfolioId, individualIds))
          .orderBy(asc(userTable.name))
      : Promise.resolve([]),
  ]);

  const membersByGroup = new Map<string, Array<{ userId: string; name: string; nim: string | null; image: string | null }>>();
  for (const person of groupPeople) {
    const list = membersByGroup.get(person.groupId) ?? [];
    list.push({
      userId: person.userId,
      name: person.name,
      nim: person.nim,
      image: imageUrl(person.image),
    });
    membersByGroup.set(person.groupId, list);
  }
  const membersByPortfolio = new Map<string, Array<{ userId: string; name: string; nim: string | null; image: string | null }>>();
  for (const person of individualPeople) {
    const list = membersByPortfolio.get(person.portfolioId) ?? [];
    list.push({
      userId: person.userId,
      name: person.name,
      nim: person.nim,
      image: imageUrl(person.image),
    });
    membersByPortfolio.set(person.portfolioId, list);
  }

  return {
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      grade: item.grade,
      updatedAt: item.updatedAt.toISOString(),
      assignmentId: item.assignmentId,
      submissionTitle: item.submissionTitle,
      who: item.groupName ?? item.ownerName,
      kind: item.groupId ? ("GROUP" as const) : ("INDIVIDUAL" as const),
      maxScore: item.maxScore,
      canModerate:
        item.assignmentStatus === "ACTIVE" &&
        ["SUBMITTED", "IN_REVIEW", "REVISED"].includes(item.status),
      members: item.groupId
        ? (membersByGroup.get(item.groupId) ?? [])
        : (membersByPortfolio.get(item.id) ?? []),
    })),
    total,
    page: input.query.page,
    pageSize: input.query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.query.pageSize)),
  };
}

export async function summarizeLecturerSubmissionProjects(input: {
  workspaceId: string;
  lecturerId: string;
  submissionId: string;
}) {
  await loadOwnedWorkspace(input.workspaceId, input.lecturerId);
  const rows = await db
    .select({
      status: portfolio.status,
      value: count(),
    })
    .from(portfolio)
    .where(
      and(
        eq(portfolio.workspaceId, input.workspaceId),
        eq(portfolio.assignmentId, input.submissionId),
      ),
    )
    .groupBy(portfolio.status);

  const counts = Object.fromEntries(rows.map((row) => [row.status, Number(row.value)])) as Record<
    string,
    number
  >;
  const awaitingReview =
    (counts.SUBMITTED ?? 0) + (counts.IN_REVIEW ?? 0) + (counts.REVISED ?? 0);
  const total = rows.reduce((sum, row) => sum + Number(row.value), 0);
  return {
    total,
    awaitingReview,
    drafts: counts.DRAFT ?? 0,
    needRevision: counts.NEED_REVISION ?? 0,
    published: counts.PUBLISHED ?? 0,
  };
}

export async function getLecturerProjectDetail(input: {
  workspaceId: string;
  portfolioId: string;
  lecturerId: string;
  meta: Actor;
}) {
  await startLecturerReview({
    workspaceId: input.workspaceId,
    portfolioId: input.portfolioId,
    lecturerId: input.lecturerId,
    meta: input.meta,
  });

  const [current] = await db
    .select()
    .from(portfolio)
    .where(and(eq(portfolio.id, input.portfolioId), eq(portfolio.workspaceId, input.workspaceId)))
    .limit(1);
  if (!current) throw new NotFoundError("Project not found");

  const [slot] = current.assignmentId
    ? await db.select().from(assignment).where(eq(assignment.id, current.assignmentId)).limit(1)
    : [null];

  const [images, documents, links, videoRows, people] = await Promise.all([
    db
      .select()
      .from(portfolioImage)
      .where(eq(portfolioImage.portfolioId, current.id))
      .orderBy(asc(portfolioImage.sortOrder)),
    db.select().from(portfolioDocument).where(eq(portfolioDocument.portfolioId, current.id)),
    db
      .select()
      .from(portfolioLink)
      .where(eq(portfolioLink.portfolioId, current.id))
      .orderBy(asc(portfolioLink.sortOrder)),
    db.select().from(portfolioVideo).where(eq(portfolioVideo.portfolioId, current.id)).limit(1),
    current.groupId
      ? db
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
      : db
          .select({
            userId: userTable.id,
            name: userTable.name,
            nim: userTable.nim,
            image: userTable.image,
          })
          .from(portfolioContributor)
          .innerJoin(userTable, eq(userTable.id, portfolioContributor.userId))
          .where(eq(portfolioContributor.portfolioId, current.id))
          .orderBy(asc(userTable.name)),
  ]);

  const canModerate =
    slot?.status === "ACTIVE" &&
    ["SUBMITTED", "IN_REVIEW", "REVISED"].includes(current.status);

  const maxScore = slot?.maxScore ?? 100;
  const [rubric, scoreSheet, neighbors, eventFlags] = await Promise.all([
    slot ? loadAssignmentRubric(slot.id, maxScore) : Promise.resolve([]),
    loadLatestScoreSheet({ portfolioId: current.id, maxScore }),
    loadNeighborProjectIds({
      workspaceId: input.workspaceId,
      assignmentId: current.assignmentId,
      portfolioId: current.id,
      statuses: SCORING_PROJECT_STATUSES,
    }),
    db
      .select({
        eventType: portfolioEvent.eventType,
        createdAt: portfolioEvent.createdAt,
      })
      .from(portfolioEvent)
      .where(eq(portfolioEvent.portfolioId, current.id))
      .orderBy(asc(portfolioEvent.createdAt)),
  ]);

  const hasRevisionHistory = eventFlags.some((row) => row.eventType === "REVISION_REQUESTED");
  const hasResubmitted = eventFlags.some((row) => row.eventType === "RESUBMITTED");
  const revisionCount = eventFlags.filter((row) => row.eventType === "REVISION_REQUESTED").length;
  const stageTimestamps = buildJourneyStageTimestamps(eventFlags, current.createdAt);

  return {
    id: current.id,
    title: current.title,
    description: current.description ?? "",
    demoUrl: current.demoUrl ?? "",
    videoUrl: current.videoUrl ?? "",
    sourceUrl: current.sourceUrl ?? "",
    status: current.status,
    grade: current.grade,
    feedback: current.feedback,
    updatedAt: current.updatedAt.toISOString(),
    assignmentId: current.assignmentId,
    submissionType: (slot?.type ?? (current.groupId ? "GROUP" : "INDIVIDUAL")) as
      | "INDIVIDUAL"
      | "GROUP",
    maxScore,
    assignmentStatus: slot?.status ?? null,
    windowState: slot
      ? submissionWindowState({
          scheduleMode: slot.scheduleMode,
          opensAt: slot.opensAt,
          closesAt: slot.closesAt,
        })
      : null,
    canModerate,
    revisionPolicy: {
      maxRevisions: PROJECT_MAX_REVISIONS,
      revisionCount,
      canRequestRevision: revisionCount < PROJECT_MAX_REVISIONS,
      remainingRevisions: Math.max(0, PROJECT_MAX_REVISIONS - revisionCount),
    },
    rubric,
    scoreSheet,
    neighbors,
    journey: {
      hasRevisionHistory,
      hasResubmitted,
      stageTimestamps,
    },
    summary: {
      workspaceName: current.workspaceName,
      className: current.className,
      semesterLabel: current.semesterLabel,
      submissionTitle: current.submissionTitle,
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
