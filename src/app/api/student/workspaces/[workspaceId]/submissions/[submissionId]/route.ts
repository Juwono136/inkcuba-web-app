import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { assertActiveStudentMember } from "@/lib/workspaces/submissions/access";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";
import {
  getStudentSubmission,
  getSubmissionPrepareState,
} from "@/lib/workspaces/submissions";

type RouteContext = {
  params: Promise<{ workspaceId: string; submissionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-submission-get");
    const params = await context.params;
    const workspaceId = requireId(params.workspaceId, "Workspace id");
    const submissionId = requireId(params.submissionId, "Submission id");
    await assertActiveStudentMember(workspaceId, session.user.id);
    const submission = await getStudentSubmission({
      workspaceId,
      assignmentId: submissionId,
    });
    const prepare = await getSubmissionPrepareState({
      workspaceId,
      assignmentId: submissionId,
      studentId: session.user.id,
    });
    return apiSuccess({
      submission,
      prepare,
      viewerUserId: session.user.id,
    });
  } catch (error) {
    return handleApiError(error, "student-submission-get");
  }
}
