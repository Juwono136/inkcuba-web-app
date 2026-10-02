import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import {
  addWorkspaceMembersManual,
  listWorkspaceMembers,
  workspaceMembersAddSchema,
  workspaceMembersListQuerySchema,
} from "@/lib/workspaces/members";
import { requireLecturerApi } from "@/lib/workspaces/require-lecturer-api";

type RouteContext = { params: Promise<{ workspaceId: string }> };

function clientMeta(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId } = await context.params;
    const limit = await rateLimit(
      `lecturer-members-list:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const { searchParams } = new URL(request.url);
    const parsed = workspaceMembersListQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid query",
      );
    }

    const page = await listWorkspaceMembers({
      workspaceId,
      lecturerId: session.user.id,
      query: parsed.data,
    });
    return apiSuccess(page);
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-members-list");
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId } = await context.params;
    const limit = await rateLimit(
      `lecturer-members-add:${session.user.id}`,
      30,
      60 * 15,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const body = await request.json().catch(() => null);
    const parsed = workspaceMembersAddSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid payload",
      );
    }

    const meta = clientMeta(request);
    const result = await addWorkspaceMembersManual({
      workspaceId,
      lecturerId: session.user.id,
      data: parsed.data,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-members-add");
  }
}
