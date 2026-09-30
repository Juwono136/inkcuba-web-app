import "server-only";

import { AppError } from "@/lib/api/errors";
import { sendEmail } from "@/lib/email/client";
import {
  passwordChangedEmailTemplate,
  passwordChangedEmailText,
} from "@/lib/email/templates";
import { logger } from "@/lib/logger";

export type SendPasswordChangedEmailInput = {
  email: string;
  name: string;
};

export async function sendPasswordChangedEmail(
  input: SendPasswordChangedEmailInput,
): Promise<void> {
  try {
    await sendEmail({
      to: input.email,
      subject: "Password Changed — inkcuba",
      html: passwordChangedEmailTemplate(input.name),
      text: passwordChangedEmailText(input.name),
    });
  } catch (error) {
    logger.error(
      { err: error, email: input.email },
      "Failed to send password changed email",
    );

    throw new AppError(
      "Unable to send password change notification. Your password was still updated.",
      503,
      "EMAIL_DELIVERY_FAILED",
    );
  }
}
