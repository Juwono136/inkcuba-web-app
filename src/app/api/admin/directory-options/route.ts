import { NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/admin/require-admin-api";
import {
  createDirectoryOption,
  ensureDefaultDirectoryOptions,
  listDirectoryOptionsPage,
} from "@/lib/directory/service";
import {
  directoryOptionCreateSchema,
  directoryOptionListQuerySchema,
} from "@/lib/directory/validators";
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

export async function GET(request: NextRequest) {
  try {
    const { session } = await requireAdminApi();
    const limit = await rateLimit(
      `admin-directory-list:${session.user.id}`,
      120,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    await ensureDefaultDirectoryOptions();

    const { searchParams } = request.nextUrl;
    const parsed = directoryOptionListQuerySchema.safeParse({
      category: searchParams.get("category") ?? undefined,
      activeOnly:
        searchParams.get("activeOnly") === "true" ||
        searchParams.get("activeOnly") === "1",
      q: searchParams.get("q") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      throw new ValidationError("Invalid query", parsed.error.flatten());
    }

    const page = await listDirectoryOptionsPage(parsed.data);
    return apiSuccess(page);
  } catch (error) {
    return handleApiError(error, "admin-directory-list");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAdminApi();
    const limit = await rateLimit(
      `admin-directory-create:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const body = await request.json().catch(() => null);
    const parsed = directoryOptionCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid payload", parsed.error.flatten());
    }

    const meta = clientMeta(request);
    const option = await createDirectoryOption({
      data: parsed.data,
      actorId: session.user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ option });
  } catch (error) {
    return handleApiError(error, "admin-directory-create");
  }
}
