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
    preheader: "Reset your inkcuba account password.",
    title: "Reset your password",
    body: `
      <p style="margin:0 0 16px;">Hello <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 16px;">
        We received a request to reset the password for your ${escapeHtml(siteConfig.name)} account.
        Click the button below to choose a new password.
      </p>
      <p style="margin:0;font-size:14px;color:#64748B;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    `,
    ctaLabel: "Reset Password",
    ctaUrl: url,
  });
}

export function resetPasswordEmailText(url: string, name: string): string {
  return `Hello ${name},

Reset your ${siteConfig.name} password using the link below:
${url}

If you did not request this, you can ignore this email.

— ${siteConfig.name}`;
}
