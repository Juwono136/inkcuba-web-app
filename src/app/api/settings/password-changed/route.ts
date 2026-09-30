import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { sendPasswordChangedEmail } from "@/lib/email/services/password-changed";
import { rateLimit } from "@/lib/redis";
import { requireApiSession } from "@/lib/settings/require-api-session";

export async function POST(_request: NextRequest) {
  try {
    const { session } = await requireApiSession();
    const userId = session.user.id;

    const limit = await rateLimit(
      `settings-password-notify:${userId}`,
      5,
      60 * 15,
    );

    if (!limit.success) {
      throw new ValidationError(
        "Too many requests. Please try again later.",
      );
    }

    await sendPasswordChangedEmail({
      email: session.user.email,
      name: session.user.name,
    });

    return apiSuccess({ sent: true });
  } catch (error) {
    return handleApiError(error, "settings-password-notify");
  }
}
