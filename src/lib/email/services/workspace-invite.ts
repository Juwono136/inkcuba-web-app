import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user as userTable } from "@/db/schema/auth";
import { workspaceEmailOutbox } from "@/db/schema/workspaces";
import { sendEmail } from "@/lib/email/client";
import {
  workspaceInviteActivateTemplate,
  workspaceInviteActivateText,
  workspaceInviteExistingTemplate,
  workspaceInviteExistingText,
  workspaceInviteRegisteredNoLoginTemplate,
  workspaceInviteRegisteredNoLoginText,
  workspaceJoinedTemplate,
  workspaceJoinedText,
} from "@/lib/email/templates";
import { logger } from "@/lib/logger";

export async function processInviteEmailOutbox(outboxId: string): Promise<void> {
  const rows = await db
    .select()
    .from(workspaceEmailOutbox)
    .where(eq(workspaceEmailOutbox.id, outboxId))
    .limit(1);

  const outbox = rows[0];
  if (!outbox) return;
  if (outbox.status === "SENT") return;

  const payload = (outbox.payload ?? {}) as {
    workspaceName?: string;
    lecturerName?: string;
    className?: string;
    semesterLabel?: string;
    activationUrl?: string | null;
  };

  const userRows = await db
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.email, outbox.recipient))
    .limit(1);

  const studentName = userRows[0]?.name ?? outbox.recipient;
  const ctaUrl =
    payload.activationUrl ||
    `${process.env.BETTER_AUTH_URL?.replace(/\/$/, "")}/dashboard/student`;

  const input = {
    studentName,
    workspaceName: payload.workspaceName ?? "Workspace",
    lecturerName: payload.lecturerName ?? "Lecturer",
    className: payload.className ?? "",
    semesterLabel: payload.semesterLabel ?? "",
    ctaUrl,
  };

  let subject = "You're invited to a workspace — inkcuba";
  let html = workspaceInviteExistingTemplate(input);
  let text = workspaceInviteExistingText(input);

  if (outbox.template === "INVITE_REGISTERED_NO_LOGIN") {
    subject = "Set your password — workspace invitation — inkcuba";
    html = workspaceInviteRegisteredNoLoginTemplate(input);
    text = workspaceInviteRegisteredNoLoginText(input);
  } else if (outbox.template === "INVITE_ACTIVATE") {
    subject = "Activate your account — workspace invitation — inkcuba";
    html = workspaceInviteActivateTemplate(input);
    text = workspaceInviteActivateText(input);
  } else if (outbox.template === "WORKSPACE_JOINED") {
    subject = "Welcome to your workspace — inkcuba";
    html = workspaceJoinedTemplate(input);
    text = workspaceJoinedText(input);
  }

  try {
    await db
      .update(workspaceEmailOutbox)
      .set({ attempts: outbox.attempts + 1 })
      .where(eq(workspaceEmailOutbox.id, outbox.id));

    await sendEmail({
      to: outbox.recipient,
      subject,
      html,
      text,
    });

    await db
      .update(workspaceEmailOutbox)
      .set({
        status: "SENT",
        sentAt: new Date(),
        lastError: null,
      })
      .where(eq(workspaceEmailOutbox.id, outbox.id));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email delivery failed";
    logger.error({ err: error, outboxId }, "Workspace invite email failed");
    await db
      .update(workspaceEmailOutbox)
      .set({
        status: "FAILED",
        lastError: message,
      })
      .where(eq(workspaceEmailOutbox.id, outbox.id));
    throw error;
  }
}
