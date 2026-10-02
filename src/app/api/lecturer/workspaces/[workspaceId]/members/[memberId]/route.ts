import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import { removeWorkspaceMember } from "@/lib/workspaces/members";
import { requireLecturerApi } from "@/lib/workspaces/require-lecturer-api";

type RouteContext = {
  params: Promise<{ workspaceId: string; memberId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId, memberId } = await context.params;
    const limit = await rateLimit(
      `lecturer-members-remove:${session.user.id}`,
      40,
      60 * 15,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    await removeWorkspaceMember({
      workspaceId,
      lecturerId: session.user.id,
      memberId,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess({ removed: true });
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-members-remove");
  }
}
