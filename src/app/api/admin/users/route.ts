import { NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { listAdminUsers } from "@/lib/admin/users/service";
import {
  adminUserListQuerySchema,
  parseTrashFlag,
} from "@/lib/admin/users/validators";
import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAdminApi();

    const limit = await rateLimit(
      `admin-users-list:${session.user.id}`,
      120,
      60,
    );

    if (!limit.success) {
      throw new ValidationError(
        "Too many requests. Please wait a moment and try again.",
      );
    }

    const { searchParams } = request.nextUrl;
    const parsed = adminUserListQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      role: searchParams.get("role") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortDir: searchParams.get("sortDir") ?? undefined,
      trash: parseTrashFlag(searchParams.get("trash")),
    });

    if (!parsed.success) {
      throw new ValidationError("Invalid list query", parsed.error.flatten());
    }

    const data = await listAdminUsers(parsed.data);
    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error, "admin-users-list");
  }
}
