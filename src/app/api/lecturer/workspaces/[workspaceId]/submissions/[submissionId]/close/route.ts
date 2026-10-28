import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { lecturerGuard, requireId } from "@/lib/workspaces/submissions/http";
import { closeLecturerSubmission } from "@/lib/workspaces/submissions";

type RouteContext = {
  params: Promise<{ workspaceId: string; submissionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await lecturerGuard(
      request,
      "lecturer-submission-close",
      30,
      60 * 15,
    );
    const params = await context.params;
    const submission = await closeLecturerSubmission({
      workspaceId: requireId(params.workspaceId, "Workspace id"),
      lecturerId: session.user.id,
      assignmentId: requireId(params.submissionId, "Submission id"),
      meta,
    });
    return apiSuccess({ submission });
  } catch (error) {
    return handleApiError(error, "lecturer-submission-close");
  }
}
