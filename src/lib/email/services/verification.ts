import "server-only";

import { AppError } from "@/lib/api/errors";
import { sendEmail } from "@/lib/email/client";
import {
  verificationEmailTemplate,
  verificationEmailText,
} from "@/lib/email/templates";
import { logger } from "@/lib/logger";

export type SendVerificationEmailInput = {
  email: string;
  name: string;
  verificationUrl: string;
};

export async function sendVerificationEmail(
  input: SendVerificationEmailInput,
): Promise<void> {
  const subject = "Verify Your Email — inkcuba";

  try {
    await sendEmail({
      to: input.email,
      subject,
      html: verificationEmailTemplate(input.verificationUrl, input.name),
      text: verificationEmailText(input.verificationUrl, input.name),
    });

    logger.info(
      { email: input.email },
      "Verification email sent after registration",
    );
  } catch (error) {
    logger.error(
      { err: error, email: input.email },
      "Failed to send verification email",
    );

    throw new AppError(
      "Your account was created, but we could not send the verification email. Please try signing in and request a new verification link.",
      503,
      "EMAIL_DELIVERY_FAILED",
    );
  }
}
