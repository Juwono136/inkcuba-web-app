import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { loadOwnedWorkspace } from "@/lib/workspaces/submissions/access";
import { lecturerGuard, requireId } from "@/lib/workspaces/submissions/http";
import { deleteEmptySubmissionGroup } from "@/lib/workspaces/submissions";

type RouteContext = {
  params: Promise<{ workspaceId: string; submissionId: string; groupId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await lecturerGuard(
      request,
      "lecturer-submission-group-delete",
      30,
      60 * 15,
    );
    const params = await context.params;
    const workspaceId = requireId(params.workspaceId, "Workspace id");
    await loadOwnedWorkspace(workspaceId, session.user.id);
    await deleteEmptySubmissionGroup({
      workspaceId,
      assignmentId: requireId(params.submissionId, "Submission id"),
      groupId: requireId(params.groupId, "Group id"),
      meta,
    });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error, "lecturer-submission-group-delete");
  }
}
