import { siteConfig } from "@/config/site";
import { escapeHtml } from "@/lib/email/escape";
import { buildEmailLayout } from "@/lib/email/layout";

export { buildEmailLayout } from "@/lib/email/layout";

export function verificationEmailTemplate(url: string, name: string): string {
  const safeName = escapeHtml(name);

  return buildEmailLayout({
    preheader: "Verify your inkcuba account to complete registration.",
    title: "Verify your email address",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 16px;">
        Thank you for registering on <strong>${escapeHtml(siteConfig.name)}</strong>.
        Your account has been created successfully. To activate your account and access the platform,
        please verify your BINUS institutional email address.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
        <tr>
          <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#475569;">
            <strong style="color:#0F172A;">Why verify?</strong><br />
            Email verification keeps the exhibition platform secure and ensures only verified BINUS members can publish and manage portfolios.
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:14px;color:#64748B;">
        Click the button below to confirm your email. This link expires in <strong>24 hours</strong>.
      </p>
    `,
    ctaLabel: "Verify Email Address",
    ctaUrl: url,
    footerNote:
      "If you did not create an account on inkcuba, you can safely ignore this email.",
  });
}

export function verificationEmailText(url: string, name: string): string {
  return `Hello ${name},

Thank you for registering on ${siteConfig.name}. Your account has been created successfully.

Please verify your email address by opening the link below:
${url}

This link expires in 24 hours.

If you did not create this account, you can ignore this email.

— ${siteConfig.name}`;
}

export function resetPasswordEmailTemplate(url: string, name: string): string {
  const safeName = escapeHtml(name);

  return buildEmailLayout({
    preheader: "Reset your inkcuba account password securely.",
    title: "Reset your password",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 16px;">
        We received a request to reset the password for your <strong>${escapeHtml(siteConfig.name)}</strong> account
        linked to your BINUS institutional email.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
        <tr>
          <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#475569;">
            <strong style="color:#0F172A;">Security notice</strong><br />
            This link expires in <strong>1 hour</strong>. After resetting, all active sessions will be signed out for your protection.
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:14px;color:#64748B;">
        Click the button below to set a new password. If you did not request this, you can safely ignore this email.
      </p>
    `,
    ctaLabel: "Reset Password",
    ctaUrl: url,
    footerNote:
      "Never share this link with anyone. inkcuba staff will never ask for your password.",
  });
}

export function resetPasswordEmailText(url: string, name: string): string {
  return `Hello ${name},

We received a request to reset your ${siteConfig.name} password.

Reset your password using the link below (expires in 1 hour):
${url}

After resetting, all active sessions will be signed out.

If you did not request this, you can ignore this email.

— ${siteConfig.name}`;
}

export function passwordChangedEmailTemplate(name: string): string {
  const safeName = escapeHtml(name);

  return buildEmailLayout({
    preheader: "Your inkcuba password was changed successfully.",
    title: "Password changed",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 16px;">
        This is a confirmation that the password for your
        <strong>${escapeHtml(siteConfig.name)}</strong> account was changed successfully.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
        <tr>
          <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#475569;">
            <strong style="color:#0F172A;">Security notice</strong><br />
            Other active sessions on your account have been signed out. If you did not make this change, reset your password immediately and contact support.
          </td>
        </tr>
      </table>
    `,
    footerNote:
      "If you did not change your password, please secure your account right away.",
  });
}

export function passwordChangedEmailText(name: string): string {
  return `Hello ${name},

This is a confirmation that the password for your ${siteConfig.name} account was changed successfully.

Other active sessions on your account have been signed out. If you did not make this change, reset your password immediately and contact support.

— ${siteConfig.name}`;
}

type WorkspaceInviteEmailInput = {
  studentName: string;
  workspaceName: string;
  lecturerName: string;
  className: string;
  semesterLabel: string;
  ctaUrl: string;
};

export function workspaceInviteExistingTemplate(
  input: WorkspaceInviteEmailInput,
): string {
  return buildEmailLayout({
    preheader: `You're invited to ${input.workspaceName} on inkcuba.`,
    title: "You're invited to a workspace",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(input.studentName)}</strong>,</p>
      <p style="margin:0 0 16px;">
        <strong>${escapeHtml(input.lecturerName)}</strong> invited you to join
        <strong>${escapeHtml(input.workspaceName)}</strong>
        on ${escapeHtml(siteConfig.name)}.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
        <tr>
          <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#475569;">
            <strong style="color:#0F172A;">Class</strong> · ${escapeHtml(input.className)}<br />
            <strong style="color:#0F172A;">Semester</strong> · ${escapeHtml(input.semesterLabel)}
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:14px;color:#64748B;">
        Sign in to open the workspace and follow your lecturer’s next steps for submissions.
      </p>
    `,
    ctaLabel: "Open workspace",
    ctaUrl: input.ctaUrl,
    footerNote: "If you were not expecting this invitation, you can ignore this email.",
  });
}

export function workspaceInviteExistingText(
  input: WorkspaceInviteEmailInput,
): string {
  return `Hello ${input.studentName},

You have been invited to workspace "${input.workspaceName}" (${input.className} · ${input.semesterLabel}) by ${input.lecturerName} on ${siteConfig.name}.

Open your dashboard: ${input.ctaUrl}

— ${siteConfig.name}`;
}

export function workspaceInviteRegisteredNoLoginTemplate(
  input: WorkspaceInviteEmailInput,
): string {
  return buildEmailLayout({
    preheader: `Activate your account to join workspace ${input.workspaceName}.`,
    title: "Workspace invitation — set your password",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(input.studentName)}</strong>,</p>
      <p style="margin:0 0 16px;">
        You have been invited to
        <strong>${escapeHtml(input.workspaceName)}</strong>
        (${escapeHtml(input.className)} · ${escapeHtml(input.semesterLabel)})
        by <strong>${escapeHtml(input.lecturerName)}</strong>.
      </p>
      <p style="margin:0 0 16px;">
        Your account already exists on ${escapeHtml(siteConfig.name)}, but you have not signed in yet.
        Please set or reset your password first, then open the dashboard to access the workspace.
      </p>
    `,
    ctaLabel: "Set / reset password",
    ctaUrl: input.ctaUrl,
    footerNote: "After setting your password, sign in to access the invited workspace.",
  });
}

export function workspaceInviteRegisteredNoLoginText(
  input: WorkspaceInviteEmailInput,
): string {
  return `Hello ${input.studentName},

You have been invited to workspace "${input.workspaceName}" (${input.className} · ${input.semesterLabel}) by ${input.lecturerName}.

Your account exists but you have not signed in yet. Set or reset your password here:
${input.ctaUrl}

— ${siteConfig.name}`;
}

export function workspaceInviteActivateTemplate(
  input: WorkspaceInviteEmailInput,
): string {
  return buildEmailLayout({
    preheader: `Activate your inkcuba account for workspace ${input.workspaceName}.`,
    title: "Activate your account",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(input.studentName)}</strong>,</p>
      <p style="margin:0 0 16px;">
        You have been invited to the workspace
        <strong>${escapeHtml(input.workspaceName)}</strong>
        (${escapeHtml(input.className)} · ${escapeHtml(input.semesterLabel)})
        by <strong>${escapeHtml(input.lecturerName)}</strong>.
      </p>
      <p style="margin:0 0 16px;">
        An account was created for you on ${escapeHtml(siteConfig.name)}.
        Please <strong>activate your account and create a password</strong> before accessing the dashboard or the workspace.
      </p>
    `,
    ctaLabel: "Activate & create password",
    ctaUrl: input.ctaUrl,
    footerNote:
      "This activation link expires in 7 days. Do not share it with anyone.",
  });
}

export function workspaceInviteActivateText(
  input: WorkspaceInviteEmailInput,
): string {
  return `Hello ${input.studentName},

You have been invited to workspace "${input.workspaceName}" (${input.className} · ${input.semesterLabel}) by ${input.lecturerName}.

An account was created for you. Activate your account and create a password:
${input.ctaUrl}

This link expires in 7 days.

— ${siteConfig.name}`;
}

export function workspaceJoinedTemplate(
  input: WorkspaceInviteEmailInput,
): string {
  return buildEmailLayout({
    preheader: `You're now in ${input.workspaceName} on inkcuba.`,
    title: "Welcome to your workspace",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(input.studentName)}</strong>,</p>
      <p style="margin:0 0 16px;">
        You successfully joined
        <strong>${escapeHtml(input.workspaceName)}</strong>
        taught by <strong>${escapeHtml(input.lecturerName)}</strong>.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;">
        <tr>
          <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#065F46;">
            <strong>Class</strong> · ${escapeHtml(input.className)}<br />
            <strong>Semester</strong> · ${escapeHtml(input.semesterLabel)}
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:14px;color:#64748B;">
        Open your student dashboard anytime to view workspace info, classmates, and upcoming submissions.
      </p>
    `,
    ctaLabel: "Go to workspace",
    ctaUrl: input.ctaUrl,
    footerNote: "Keep this email for your records. You can leave or re-join only if your lecturer allows it.",
  });
}

export function workspaceJoinedText(input: WorkspaceInviteEmailInput): string {
  return `Hello ${input.studentName},

You successfully joined "${input.workspaceName}" (${input.className} · ${input.semesterLabel}) taught by ${input.lecturerName}.

Open your workspace: ${input.ctaUrl}

— ${siteConfig.name}`;
}

export type ProjectEmailInput = {
  recipientName: string;
  projectTitle: string;
  workspaceName: string;
  submissionTitle: string;
  ctaUrl: string;
  feedback?: string | null;
  grade?: number | null;
  maxScore?: number | null;
  deadlineLabel?: string | null;
  /** student = contributor copy; lecturer = workspace owner copy */
  audience?: "student" | "lecturer";
  /** Used for submit/resubmit student + lecturer wording */
  eventKind?: "SUBMITTED" | "REVISED";
  /** Journey stage label for stage-focused notifications */
  journeyStage?: string | null;
  scoringSheetAvailable?: boolean;
  revisionRound?: number | null;
  maxRevisions?: number | null;
};

function projectMetaCard(input: ProjectEmailInput) {
  const rows = [
    ["Project", input.projectTitle],
    ["Workspace", input.workspaceName],
    ["Submission", input.submissionTitle],
  ];
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 18px;background:#F8FAFC;border:2px solid #0F172A;border-radius:14px;box-shadow:3px 3px 0 #CBD5E1;">
    ${rows
      .map(
        ([label, value], index) => `<tr>
      <td style="padding:12px 16px;${index < rows.length - 1 ? "border-bottom:1px solid #E2E8F0;" : ""}font-size:13px;line-height:1.55;color:#475569;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94A3B8;margin:0 0 4px;">${escapeHtml(label)}</div>
        <div style="font-size:15px;font-weight:600;color:#0F172A;word-break:break-word;">${escapeHtml(value)}</div>
      </td>
    </tr>`,
      )
      .join("")}
  </table>`;
}

export function projectSubmittedStudentTemplate(input: ProjectEmailInput): string {
  const isRevised = input.eventKind === "REVISED";
  return buildEmailLayout({
    preheader: isRevised
      ? `Your revised project “${input.projectTitle}” was sent to your lecturer.`
      : `Your project “${input.projectTitle}” was submitted successfully.`,
    title: isRevised ? "Project resubmitted" : "Project submitted",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(input.recipientName)}</strong>,</p>
      <p style="margin:0 0 16px;">
        ${
          isRevised
            ? "Your revised project was sent to your lecturer again and is waiting for moderation."
            : "Your project was sent to your lecturer and is waiting for moderation and scoring."
        }
      </p>
      ${projectMetaCard(input)}
      <p style="margin:0;font-size:14px;color:#64748B;">
        Editing stays locked while scoring is in progress. We will email you when your lecturer publishes or requests another revision.
      </p>
    `,
    ctaLabel: "Open project",
    ctaUrl: input.ctaUrl,
    footerNote: "If you did not submit this project, contact your lecturer.",
  });
}

export function projectSubmittedStudentText(input: ProjectEmailInput): string {
  const isRevised = input.eventKind === "REVISED";
  return `Hello ${input.recipientName},

Your project "${input.projectTitle}" for ${input.submissionTitle} in ${input.workspaceName} was ${
    isRevised ? "resubmitted" : "submitted"
  } successfully and is waiting for lecturer moderation.

Open project: ${input.ctaUrl}

— ${siteConfig.name}`;
}

export function projectSubmittedLecturerTemplate(input: ProjectEmailInput): string {
  const isRevised = input.eventKind === "REVISED";
  return buildEmailLayout({
    preheader: isRevised
      ? `A revised project is ready to review: ${input.projectTitle}.`
      : `A student project is ready to review: ${input.projectTitle}.`,
    title: isRevised ? "Revised project ready" : "New project to score",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(input.recipientName)}</strong>,</p>
      <p style="margin:0 0 16px;">
        ${
          isRevised
            ? "A student team resubmitted a project after your revision request. It is ready for another moderation pass."
            : "A student project was submitted in your workspace and is ready for moderation and scoring."
        }
      </p>
      ${projectMetaCard(input)}
      <p style="margin:0;font-size:14px;color:#64748B;">
        Open Scoring to review the project, request another revision, or publish it with a score.
      </p>
    `,
    ctaLabel: "Open Scoring",
    ctaUrl: input.ctaUrl,
    footerNote: "You can moderate while the submission stays Active, even after the student schedule window.",
  });
}

export function projectSubmittedLecturerText(input: ProjectEmailInput): string {
  const isRevised = input.eventKind === "REVISED";
  return `Hello ${input.recipientName},

A project was ${isRevised ? "resubmitted" : "submitted"} for moderation.

Project: ${input.projectTitle}
Workspace: ${input.workspaceName}
Submission: ${input.submissionTitle}

Open Scoring: ${input.ctaUrl}

— ${siteConfig.name}`;
}

export function projectRevisionRequestedTemplate(input: ProjectEmailInput): string {
  const feedbackBlock = input.feedback
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#FFFBEB;border:2px solid #F59E0B;border-radius:14px;">
        <tr>
          <td style="padding:14px 16px;font-size:14px;line-height:1.65;color:#92400E;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;">Lecturer feedback</div>
            ${escapeHtml(input.feedback)}
          </td>
        </tr>
      </table>`
    : "";
  const deadline = input.deadlineLabel
    ? `<p style="margin:0 0 16px;font-size:14px;color:#64748B;">Revise and resubmit before <strong>${escapeHtml(input.deadlineLabel)}</strong>.</p>`
    : "";
  const stage = input.journeyStage
    ? `<p style="margin:0 0 16px;font-size:14px;color:#64748B;">Journey stage: <strong>${escapeHtml(input.journeyStage)}</strong>.</p>`
    : "";
  const revisionCap =
    input.revisionRound != null && input.maxRevisions != null
      ? `<p style="margin:0 0 16px;font-size:14px;color:#64748B;">This is revision round <strong>${input.revisionRound}</strong> of <strong>${input.maxRevisions}</strong>. After the limit, the lecturer must publish a final score.</p>`
      : "";
  return buildEmailLayout({
    preheader: `Revision requested for “${input.projectTitle}”.`,
    title: "Revision requested",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(input.recipientName)}</strong>,</p>
      <p style="margin:0 0 16px;">
        Your lecturer asked for a revision. Update the project and submit again while the submission window is still open.
        ${input.audience === "student" ? "Every group member on this project receives this notice." : ""}
      </p>
      ${stage}
      ${revisionCap}
      ${projectMetaCard(input)}
      ${feedbackBlock}
      ${deadline}
    `,
    ctaLabel: "Revise project",
    ctaUrl: input.ctaUrl,
    footerNote: "After the deadline, revision and resubmit stay closed.",
  });
}

export function projectRevisionRequestedText(input: ProjectEmailInput): string {
  return `Hello ${input.recipientName},

Your lecturer requested a revision for "${input.projectTitle}" (${input.submissionTitle}).
${input.journeyStage ? `Journey stage: ${input.journeyStage}\n` : ""}${input.revisionRound != null && input.maxRevisions != null ? `Revision round: ${input.revisionRound} of ${input.maxRevisions}\n` : ""}
Feedback:
${input.feedback ?? "(none)"}

${input.deadlineLabel ? `Deadline: ${input.deadlineLabel}\n` : ""}
Revise project: ${input.ctaUrl}

— ${siteConfig.name}`;
}

export function projectPublishedTemplate(input: ProjectEmailInput): string {
  const score =
    input.grade != null && input.maxScore != null
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#ECFDF5;border:2px solid #059669;border-radius:14px;">
          <tr>
            <td style="padding:14px 16px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#047857;margin:0 0 4px;">Score</div>
              <div style="font-size:22px;font-weight:800;color:#065F46;">${input.grade} <span style="font-size:14px;font-weight:600;color:#059669;">/ ${input.maxScore}</span></div>
            </td>
          </tr>
        </table>`
      : "";
  const feedbackBlock = input.feedback
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#F0FDFA;border:1px solid #99F6E4;border-radius:14px;">
        <tr>
          <td style="padding:14px 16px;font-size:14px;line-height:1.65;color:#115E59;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;">Lecturer note</div>
            ${escapeHtml(input.feedback)}
          </td>
        </tr>
      </table>`
    : "";
  const stage = input.journeyStage
    ? `<p style="margin:0 0 16px;font-size:14px;color:#64748B;">Journey stage: <strong>${escapeHtml(input.journeyStage)}</strong>.</p>`
    : "";
  const sheetNote = input.scoringSheetAvailable
    ? `<p style="margin:0 0 16px;font-size:14px;color:#64748B;">Open the project to view the full scoring sheet.</p>`
    : "";
  return buildEmailLayout({
    preheader: `“${input.projectTitle}” was published and verified.`,
    title: "Project published",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(input.recipientName)}</strong>,</p>
      <p style="margin:0 0 16px;">
        Your lecturer finished moderation. The project is verified and marked published. Editing is closed.
      </p>
      ${stage}
      ${projectMetaCard(input)}
      ${score}
      ${feedbackBlock}
      ${sheetNote}
    `,
    ctaLabel: "View project",
    ctaUrl: input.ctaUrl,
    footerNote: "Published projects stay on your Project lists. Public exhibition pages will follow later.",
  });
}

export function projectPublishedText(input: ProjectEmailInput): string {
  return `Hello ${input.recipientName},

Your project "${input.projectTitle}" was published and verified.
${input.journeyStage ? `Journey stage: ${input.journeyStage}\n` : ""}
${input.grade != null && input.maxScore != null ? `Score: ${input.grade} / ${input.maxScore}\n` : ""}${input.feedback ? `Note: ${input.feedback}\n` : ""}${input.scoringSheetAvailable ? "A scoring sheet is available on the project page.\n" : ""}
View project: ${input.ctaUrl}

— ${siteConfig.name}`;
}

export function projectPublishedLecturerTemplate(input: ProjectEmailInput): string {
  const score =
    input.grade != null && input.maxScore != null
      ? `<p style="margin:0 0 16px;font-size:15px;"><strong>Score recorded:</strong> ${input.grade} / ${input.maxScore}</p>`
      : "";
  return buildEmailLayout({
    preheader: `You published “${input.projectTitle}”.`,
    title: "Publish confirmed",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(input.recipientName)}</strong>,</p>
      <p style="margin:0 0 16px;">
        The project is now published and verified. Students on this project were notified by email.
      </p>
      ${projectMetaCard(input)}
      ${score}
      <p style="margin:0;font-size:14px;color:#64748B;">
        You can reopen Scoring anytime to review other projects in this submission.
      </p>
    `,
    ctaLabel: "Open Scoring",
    ctaUrl: input.ctaUrl,
    footerNote: "This confirmation is for your records. Students see the score on their project page.",
  });
}

export function projectPublishedLecturerText(input: ProjectEmailInput): string {
  return `Hello ${input.recipientName},

You published "${input.projectTitle}" (${input.submissionTitle} in ${input.workspaceName}).
${input.grade != null && input.maxScore != null ? `Score: ${input.grade} / ${input.maxScore}\n` : ""}
Open Scoring: ${input.ctaUrl}

— ${siteConfig.name}`;
}

