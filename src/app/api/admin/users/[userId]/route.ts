import { NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/admin/require-admin-api";
import {
  getAdminUserDetail,
  hardDeleteAdminUser,
  patchAdminUser,
  softDeleteAdminUser,
} from "@/lib/admin/users/service";
import { adminUserPatchSchema } from "@/lib/admin/users/validators";
import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

function clientMeta(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireAdminApi();
    const { userId } = await context.params;

    const limit = await rateLimit(
      `admin-users-get:${session.user.id}`,
      120,
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

    const user = await getAdminUserDetail(userId, { includeDeleted: true });
    return apiSuccess({ user });
  } catch (error) {
    return handleApiError(error, "admin-users-get");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireAdminApi();
    const { userId } = await context.params;

    const limit = await rateLimit(
      `admin-users-patch:${session.user.id}`,
      60,
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

    const body = await request.json().catch(() => null);
    const parsed = adminUserPatchSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message;
      throw new ValidationError(
        firstIssue || "Invalid update payload",
        parsed.error.flatten(),
      );
    }

    const meta = clientMeta(request);
    const user = await patchAdminUser({
      actorId: session.user.id,
      userId,
      patch: parsed.data,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ user });
  } catch (error) {
    return handleApiError(error, "admin-users-patch");
  }
}

/**
 * Soft-delete (default) or hard-delete when `?hard=true` and user is already in trash.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireAdminApi();
    const { userId } = await context.params;

    const limit = await rateLimit(
      `admin-users-delete:${session.user.id}`,
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

    const meta = clientMeta(request);
    const hard =
      request.nextUrl.searchParams.get("hard") === "true" ||
      request.nextUrl.searchParams.get("hard") === "1";

    if (hard) {
      const result = await hardDeleteAdminUser({
        actorId: session.user.id,
        userId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      return apiSuccess(result);
    }

    const user = await softDeleteAdminUser({
      actorId: session.user.id,
      userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ user });
  } catch (error) {
    return handleApiError(error, "admin-users-delete");
  }
}
