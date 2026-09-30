import { NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { restoreAdminUser } from "@/lib/admin/users/service";
import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireAdminApi();
    const { userId } = await context.params;

    const limit = await rateLimit(
      `admin-users-restore:${session.user.id}`,
      30,
      60,
    );

    if (!limit.success) {
      throw new ValidationError(
        "Too many requests. Please wait a moment and try again.",
      );
    }

    if (!userId?.trim()) {
      throw new ValidationError("User id is required");
    }

    const user = await restoreAdminUser({
      actorId: session.user.id,
      userId,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess({ user });
  } catch (error) {
    return handleApiError(error, "admin-users-restore");
  }
}
