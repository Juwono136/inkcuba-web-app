import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { portfolio, portfolioContributor } from "@/db/schema/portfolios";
import { workspace } from "@/db/schema/workspaces";
import { siteConfig } from "@/config/site";
import { enqueueProjectNotification } from "@/lib/email/services/project-notify";
import type { ProjectStatus } from "@/lib/projects/limits";

function appBaseUrl() {
  return (siteConfig.appUrl || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

async function loadContributorEmails(portfolioId: string) {
  const rows = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(portfolioContributor)
    .innerJoin(userTable, eq(userTable.id, portfolioContributor.userId))
    .where(eq(portfolioContributor.portfolioId, portfolioId));
  const people = rows.filter((row) => Boolean(row.email));
  if (people.length > 0) return people;

  const [owner] = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(portfolio)
    .innerJoin(userTable, eq(userTable.id, portfolio.submittedById))
    .where(eq(portfolio.id, portfolioId))
    .limit(1);
  return owner?.email ? [owner] : [];
}

/**
 * Post-submit emails only. Kept outside `moderation.ts` so student project
 * routes that call submit do not compile/load the full lecturer moderation graph.
 */
export async function notifyAfterStudentSubmit(input: {
  portfolioId: string;
  studentId: string;
  status: ProjectStatus;
}) {
  const [current] = await db.select().from(portfolio).where(eq(portfolio.id, input.portfolioId)).limit(1);
  if (!current) return;

  const eventKind = input.status === "REVISED" ? ("REVISED" as const) : ("SUBMITTED" as const);
  const contributors = await loadContributorEmails(current.id);
  for (const person of contributors) {
    await enqueueProjectNotification(db, {
      portfolioId: current.id,
      workspaceId: current.workspaceId,
      recipient: person.email,
      template: "PROJECT_SUBMITTED_STUDENT",
      payload: {
        recipientName: person.name,
        projectTitle: current.title,
        workspaceName: current.workspaceName ?? "Workspace",
        submissionTitle: current.submissionTitle ?? "Submission",
        ctaUrl: `${appBaseUrl()}/dashboard/student/projects/${current.id}?source=lists`,
        audience: "student",
        eventKind,
      },
    });
  }

  if (current.workspaceId) {
    const [ws] = await db.select().from(workspace).where(eq(workspace.id, current.workspaceId)).limit(1);
    if (ws) {
      const [lecturer] = await db
        .select({ email: userTable.email, name: userTable.name })
        .from(userTable)
        .where(eq(userTable.id, ws.lecturerId))
        .limit(1);
      if (lecturer?.email) {
        await enqueueProjectNotification(db, {
          portfolioId: current.id,
          workspaceId: current.workspaceId,
          recipient: lecturer.email,
          template: "PROJECT_SUBMITTED_LECTURER",
          payload: {
            recipientName: lecturer.name,
            projectTitle: current.title,
            workspaceName: current.workspaceName ?? ws.name,
            submissionTitle: current.submissionTitle ?? "Submission",
            ctaUrl: current.assignmentId
              ? `${appBaseUrl()}/dashboard/lecturer/workspaces/${current.workspaceId}?tab=scoring&scoringSubmission=${current.assignmentId}&project=${current.id}`
              : `${appBaseUrl()}/dashboard/lecturer/workspaces/${current.workspaceId}?tab=scoring&project=${current.id}`,
            audience: "lecturer",
            eventKind,
          },
        });
      }
    }
  }
}
