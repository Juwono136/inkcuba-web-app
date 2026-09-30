import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { getLoginHistoryForUser } from "@/lib/auth/login-history";
import { rateLimit } from "@/lib/redis";
import { requireApiSession } from "@/lib/settings/require-api-session";

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireApiSession();
    const userId = session.user.id;

    const limit = await rateLimit(`settings-login-history:${userId}`, 60, 60);

    if (!limit.success) {
      throw new ValidationError(
        "Too many requests. Please wait a moment and try again.",
      );
    }

    const { searchParams } = request.nextUrl;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "10");

    const data = await getLoginHistoryForUser({
      userId,
      currentSessionId: session.session.id,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 10,
    });

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error, "settings-login-history");
  }
}
