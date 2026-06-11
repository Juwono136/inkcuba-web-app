import { brandAssets } from "@/config/brand";
import { siteConfig } from "@/config/site";
import { escapeHtml } from "@/lib/email/escape";

export type EmailLayoutOptions = {
  preheader: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

export function buildEmailLayout({
  preheader,
  title,
  body,
  ctaLabel,
  ctaUrl,
  footerNote,
}: EmailLayoutOptions): string {
  const safeTitle = escapeHtml(title);
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
          <tr>
            <td align="center" style="border-radius:999px;background:#0EA5E9;">
              <a href="${ctaUrl}"
                 style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;border:2px solid #0F172A;">
                ${escapeHtml(ctaLabel)}
              </a>
            </td>
          </tr>
        </table>`
      : "";

  const noteBlock = footerNote
    ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#64748B;">${footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>${safeTitle}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-container { width: 100% !important; }
        .email-shell { padding: 24px 20px !important; }
        .email-title { font-size: 24px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#0F172A;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
            <tr>
              <td style="padding:0 0 20px;text-align:center;">
                <img
                  src="${brandAssets.emailLogoUrl}"
                  alt="${escapeHtml(siteConfig.name)}"
                  width="56"
                  height="56"
                  style="display:block;margin:0 auto 12px;width:56px;height:56px;border:0;outline:none;text-decoration:none;"
                />
                <span style="display:inline-block;padding:8px 14px;border-radius:999px;background:#E0F2FE;color:#0284C7;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
                  ${escapeHtml(siteConfig.name)} · BINUS Portfolio Platform
                </span>
              </td>
            </tr>
            <tr>
              <td class="email-shell" style="background:#ffffff;border:2px solid #0F172A;border-radius:20px;padding:36px 32px;box-shadow:6px 6px 0 #0F172A;">
                <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#0EA5E9;letter-spacing:0.08em;text-transform:uppercase;">
                  ${escapeHtml(siteConfig.name)}
                </p>
                <h1 class="email-title" style="margin:0 0 18px;font-size:28px;line-height:1.25;color:#0F172A;">
                  ${safeTitle}
                </h1>
                <div style="font-size:15px;line-height:1.7;color:#334155;">${body}</div>
                ${ctaBlock}
                ${noteBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px 0;text-align:center;font-size:12px;line-height:1.6;color:#94A3B8;">
                <p style="margin:0 0 6px;">This is an automated message from ${escapeHtml(siteConfig.name)}. Please do not reply.</p>
                <p style="margin:0;">
                  <a href="${siteConfig.url}" style="color:#0EA5E9;text-decoration:none;font-weight:600;">Visit ${escapeHtml(siteConfig.name)}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
