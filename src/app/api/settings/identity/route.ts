import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import { requireApiSession } from "@/lib/settings/require-api-session";
import { updateSelfIdentity } from "@/lib/settings/update-identity";

export async function PATCH(request: NextRequest) {
  try {
    const { session } = await requireApiSession();

    const limit = await rateLimit(
      `settings-identity:${session.user.id}`,
      20,
      60 * 15,
    );
    if (!limit.success) {
      throw new ValidationError(
        "Too many requests. Please wait a moment and try again.",
      );
    }

    const body = await request.json().catch(() => null);
    const settings = await updateSelfIdentity({
      userId: session.user.id,
      data: body,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(settings);
  } catch (error) {
    return handleApiError(error, "settings-identity-patch");
  }
}
