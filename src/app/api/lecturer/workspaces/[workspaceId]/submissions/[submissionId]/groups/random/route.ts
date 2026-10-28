import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { loadOwnedWorkspace } from "@/lib/workspaces/submissions/access";
import { lecturerGuard, requireId } from "@/lib/workspaces/submissions/http";
import { randomizeSubmissionGroups } from "@/lib/workspaces/submissions";

type RouteContext = {
  params: Promise<{ workspaceId: string; submissionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await lecturerGuard(
      request,
      "lecturer-submission-group-random",
      15,
      60 * 15,
    );
    const params = await context.params;
    const workspaceId = requireId(params.workspaceId, "Workspace id");
    await loadOwnedWorkspace(workspaceId, session.user.id);
    const result = await randomizeSubmissionGroups({
      workspaceId,
      assignmentId: requireId(params.submissionId, "Submission id"),
      meta,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "lecturer-submission-group-random");
  }
}
