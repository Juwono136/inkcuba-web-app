import { NextRequest } from "next/server";

import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import { requireApiSession } from "@/lib/settings/require-api-session";
import { getStudentWorkspaceDetail } from "@/lib/workspaces/student-service";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { session, role } = await requireApiSession();
    if (role !== "STUDENT") {
      throw new ForbiddenError("Student access required");
    }

    const { workspaceId } = await context.params;
    const limit = await rateLimit(
      `student-workspace-detail:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const data = await getStudentWorkspaceDetail({
      studentId: session.user.id,
      workspaceId,
    });

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error, "student-workspace-detail");
  }
}
