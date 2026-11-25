import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { getLecturerProjectDetail } from "@/lib/projects/moderation";
import { lecturerGuard, requireId } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ workspaceId: string; portfolioId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await lecturerGuard(request, "lecturer-project-detail");
    const params = await context.params;
    const project = await getLecturerProjectDetail({
      workspaceId: requireId(params.workspaceId, "Workspace id"),
      portfolioId: requireId(params.portfolioId, "Project id"),
      lecturerId: session.user.id,
      meta,
    });
    return apiSuccess(project);
  } catch (error) {
    return handleApiError(error, "lecturer-project-detail");
  }
}
