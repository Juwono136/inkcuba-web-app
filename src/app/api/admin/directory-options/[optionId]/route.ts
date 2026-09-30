import { NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/admin/require-admin-api";
import {
  deleteDirectoryOption,
  updateDirectoryOption,
} from "@/lib/directory/service";
import { directoryOptionUpdateSchema } from "@/lib/directory/validators";
import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";

type RouteContext = { params: Promise<{ optionId: string }> };

function clientMeta(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireAdminApi();
    const { optionId } = await context.params;
    const limit = await rateLimit(
      `admin-directory-patch:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }
    if (!optionId?.trim()) throw new ValidationError("Option id is required");

    const body = await request.json().catch(() => null);
    const parsed = directoryOptionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid payload", parsed.error.flatten());
    }

    const meta = clientMeta(request);
    const option = await updateDirectoryOption({
      id: optionId,
      data: parsed.data,
      actorId: session.user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ option });
  } catch (error) {
    return handleApiError(error, "admin-directory-patch");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireAdminApi();
    const { optionId } = await context.params;
    const limit = await rateLimit(
      `admin-directory-delete:${session.user.id}`,
      30,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }
    if (!optionId?.trim()) throw new ValidationError("Option id is required");

    const meta = clientMeta(request);
    const result = await deleteDirectoryOption({
      id: optionId,
      actorId: session.user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "admin-directory-delete");
  }
}
