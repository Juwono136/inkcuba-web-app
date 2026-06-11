import "server-only";

import { AppError } from "@/lib/api/errors";
import { sendEmail } from "@/lib/email/client";
import {
  resetPasswordEmailTemplate,
  resetPasswordEmailText,
} from "@/lib/email/templates";
import { logger } from "@/lib/logger";

export type SendResetPasswordEmailInput = {
  email: string;
  name: string;
  resetUrl: string;
};

export async function sendResetPasswordEmail(
  input: SendResetPasswordEmailInput,
): Promise<void> {
  try {
    await sendEmail({
      to: input.email,
      subject: "Reset Password — inkcuba",
      html: resetPasswordEmailTemplate(input.resetUrl, input.name),
      text: resetPasswordEmailText(input.resetUrl, input.name),
    });
  } catch (error) {
    logger.error(
      { err: error, email: input.email },
      "Failed to send reset password email",
    );

    throw new AppError(
      "Unable to send password reset email. Please try again later.",
      503,
      "EMAIL_DELIVERY_FAILED",
    );
  }
}
