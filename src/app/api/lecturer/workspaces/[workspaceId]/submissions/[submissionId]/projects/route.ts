import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { summarizeLecturerSubmissionProjects } from "@/lib/projects/moderation";
import { lecturerGuard, requireId } from "@/lib/workspaces/submissions/http";

type RouteContext = {
  params: Promise<{ workspaceId: string; submissionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await lecturerGuard(request, "lecturer-submission-projects");
    const params = await context.params;
    const summary = await summarizeLecturerSubmissionProjects({
      workspaceId: requireId(params.workspaceId, "Workspace id"),
      submissionId: requireId(params.submissionId, "Submission id"),
      lecturerId: session.user.id,
    });
    return apiSuccess(summary);
  } catch (error) {
    return handleApiError(error, "lecturer-submission-projects");
  }
}
