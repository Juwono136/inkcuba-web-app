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

