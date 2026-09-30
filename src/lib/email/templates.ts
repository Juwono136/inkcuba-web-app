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
