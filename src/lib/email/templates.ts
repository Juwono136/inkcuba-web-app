import { siteConfig } from "@/config/site";

type EmailLayoutOptions = {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

export function buildEmailLayout({
  title,
  body,
  ctaLabel,
  ctaUrl,
}: EmailLayoutOptions): string {
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<p style="margin-top:24px">
          <a href="${ctaUrl}"
             style="display:inline-block;background:#0EA5E9;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            ${ctaLabel}
          </a>
        </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="id">
  <body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:560px;background:#ffffff;border:2px solid #0F172A;border-radius:12px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#0EA5E9;letter-spacing:0.08em;text-transform:uppercase;">
                  ${siteConfig.name}
                </p>
                <h1 style="margin:0 0 16px;font-size:24px;color:#0F172A;">${title}</h1>
                <div style="font-size:15px;line-height:1.6;color:#334155;">${body}</div>
                ${ctaBlock}
                <p style="margin-top:32px;font-size:12px;color:#94A3B8;">
                  Email ini dikirim otomatis oleh ${siteConfig.name}. Jangan balas email ini.
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

export function verificationEmailTemplate(url: string, name: string): string {
  return buildEmailLayout({
    title: "Verifikasi Akun inkcuba",
    body: `<p>Halo <strong>${name}</strong>,</p>
           <p>Terima kasih telah mendaftar di inkcuba. Klik tombol di bawah untuk memverifikasi alamat email Anda.</p>
           <p style="font-size:13px;color:#64748B;">Tautan ini berlaku selama 24 jam.</p>`,
    ctaLabel: "Verifikasi Email",
    ctaUrl: url,
  });
}

export function resetPasswordEmailTemplate(url: string, name: string): string {
  return buildEmailLayout({
    title: "Reset Password inkcuba",
    body: `<p>Halo <strong>${name}</strong>,</p>
           <p>Kami menerima permintaan reset password untuk akun Anda. Klik tombol di bawah untuk membuat password baru.</p>
           <p style="font-size:13px;color:#64748B;">Jika Anda tidak meminta reset password, abaikan email ini.</p>`,
    ctaLabel: "Reset Password",
    ctaUrl: url,
  });
}
