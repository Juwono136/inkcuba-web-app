import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import {
  requireLecturerApi,
  restoreLecturerWorkspace,
} from "@/lib/workspaces";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId } = await context.params;

    const limit = await rateLimit(
      `lecturer-workspace-restore:${session.user.id}`,
      30,
      60 * 15,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    if (!workspaceId?.trim()) {
      throw new ValidationError("Workspace id is required");
    }

    const workspace = await restoreLecturerWorkspace({
      workspaceId,
      lecturerId: session.user.id,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess({ workspace });
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-restore");
  }
}
