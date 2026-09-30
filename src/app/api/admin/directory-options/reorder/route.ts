import { NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { reorderDirectoryOptions } from "@/lib/directory/service";
import { directoryOptionReorderSchema } from "@/lib/directory/validators";
import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";

function clientMeta(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAdminApi();
    const limit = await rateLimit(
      `admin-directory-reorder:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const body = await request.json().catch(() => null);
    const parsed = directoryOptionReorderSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid payload", parsed.error.flatten());
    }

    const meta = clientMeta(request);
    const result = await reorderDirectoryOptions({
      data: parsed.data,
      actorId: session.user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "admin-directory-reorder");
  }
}
