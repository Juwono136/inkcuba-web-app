import "server-only";

import nodemailer from "nodemailer";

import { getServerEnv } from "@/config/env";
import { logger } from "@/lib/logger";

let transporter: nodemailer.Transporter | null = null;

export function getEmailTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const env = getServerEnv();
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const transport = getEmailTransporter();

  try {
    await transport.sendMail({
      from: `"inkcuba" <${getServerEnv().SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    logger.info({ to: options.to, subject: options.subject }, "Email sent");
  } catch (error) {
    logger.error(
      { err: error, to: options.to, subject: options.subject },
      "Failed to send email",
    );
    throw error;
  }
}

export async function checkEmailHealth(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const transport = getEmailTransporter();
    await transport.verify();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Email transport verify failed",
    };
  }
}
