import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { openStudentProject } from "@/lib/projects/service";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";

type RouteContext = {
  params: Promise<{ workspaceId: string; submissionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await studentGuard(request, "student-project-open", 30, 60 * 15);
    const params = await context.params;
    const opened = await openStudentProject({
      workspaceId: requireId(params.workspaceId, "Workspace id"),
      submissionId: requireId(params.submissionId, "Submission id"),
      studentId: session.user.id,
      meta,
    });
    return apiSuccess(opened);
  } catch (error) {
    return handleApiError(error, "student-project-open");
  }
}
