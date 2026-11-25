import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { projectEmailOutbox } from "@/db/schema/portfolios";
import { sendEmail } from "@/lib/email/client";
import {
  projectPublishedLecturerTemplate,
  projectPublishedLecturerText,
  projectPublishedTemplate,
  projectPublishedText,
  projectRevisionRequestedTemplate,
  projectRevisionRequestedText,
  projectSubmittedLecturerTemplate,
  projectSubmittedLecturerText,
  projectSubmittedStudentTemplate,
  projectSubmittedStudentText,
  type ProjectEmailInput,
} from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import { enqueueProjectEmail } from "@/lib/queues/project-queues";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbLike = typeof db | Tx;

export type ProjectEmailTemplate =
  | "PROJECT_SUBMITTED_STUDENT"
  | "PROJECT_SUBMITTED_LECTURER"
  | "PROJECT_REVISION_REQUESTED"
  | "PROJECT_PUBLISHED";

export async function enqueueProjectNotification(
  client: DbLike,
  input: {
    portfolioId: string;
    workspaceId: string | null;
    recipient: string;
    template: ProjectEmailTemplate;
    payload: ProjectEmailInput;
  },
) {
  const outboxId = crypto.randomUUID();
  await client.insert(projectEmailOutbox).values({
    id: outboxId,
    portfolioId: input.portfolioId,
    workspaceId: input.workspaceId,
    recipient: input.recipient,
    template: input.template,
    status: "PENDING",
    payload: input.payload as unknown as Record<string, unknown>,
  });
  try {
    await enqueueProjectEmail({ outboxId });
  } catch (error) {
    logger.warn({ err: error, outboxId }, "Project email enqueue failed; worker can retry later");
  }
  return outboxId;
}

export async function processProjectEmailOutbox(outboxId: string): Promise<void> {
  const [outbox] = await db
    .select()
    .from(projectEmailOutbox)
    .where(eq(projectEmailOutbox.id, outboxId))
    .limit(1);
  if (!outbox) return;
  if (outbox.status === "SENT") return;

  const payload = (outbox.payload ?? {}) as ProjectEmailInput;
  let subject = "Project update — inkcuba";
  let html = projectSubmittedStudentTemplate(payload);
  let text = projectSubmittedStudentText(payload);

  if (outbox.template === "PROJECT_SUBMITTED_STUDENT") {
    subject =
      payload.eventKind === "REVISED"
        ? "Project resubmitted — inkcuba"
        : "Project submitted — inkcuba";
    html = projectSubmittedStudentTemplate(payload);
    text = projectSubmittedStudentText(payload);
  } else if (outbox.template === "PROJECT_SUBMITTED_LECTURER") {
    subject =
      payload.eventKind === "REVISED"
        ? "Revised project ready — inkcuba"
        : "New project to score — inkcuba";
    html = projectSubmittedLecturerTemplate(payload);
    text = projectSubmittedLecturerText(payload);
  } else if (outbox.template === "PROJECT_REVISION_REQUESTED") {
    subject = "Revision requested — inkcuba";
    html = projectRevisionRequestedTemplate(payload);
    text = projectRevisionRequestedText(payload);
  } else if (outbox.template === "PROJECT_PUBLISHED") {
    if (payload.audience === "lecturer") {
      subject = "Publish confirmed — inkcuba";
      html = projectPublishedLecturerTemplate(payload);
      text = projectPublishedLecturerText(payload);
    } else {
      subject = "Project published — inkcuba";
      html = projectPublishedTemplate(payload);
      text = projectPublishedText(payload);
    }
  }

  try {
    await db
      .update(projectEmailOutbox)
      .set({ attempts: outbox.attempts + 1 })
      .where(eq(projectEmailOutbox.id, outbox.id));
    await sendEmail({ to: outbox.recipient, subject, html, text });
    await db
      .update(projectEmailOutbox)
      .set({ status: "SENT", sentAt: new Date(), lastError: null })
      .where(eq(projectEmailOutbox.id, outbox.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email send failed";
    logger.error({ err: error, outboxId }, "Project email send failed");
    await db
      .update(projectEmailOutbox)
      .set({ status: "FAILED", lastError: message.slice(0, 500) })
      .where(eq(projectEmailOutbox.id, outbox.id));
    throw error;
  }
}
