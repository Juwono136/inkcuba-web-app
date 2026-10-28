import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { assertActiveStudentMember } from "@/lib/workspaces/submissions/access";
import { readJson, requireId, studentGuard } from "@/lib/workspaces/submissions/http";
import {
  getStudentSubmission,
  moveSubmissionMember,
  studentSubmissionMoveSchema,
} from "@/lib/workspaces/submissions";

type RouteContext = {
  params: Promise<{ workspaceId: string; submissionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await studentGuard(
      request,
      "student-submission-move",
      40,
      60,
    );
    const params = await context.params;
    const workspaceId = requireId(params.workspaceId, "Workspace id");
    const submissionId = requireId(params.submissionId, "Submission id");
    await assertActiveStudentMember(workspaceId, session.user.id);
    await getStudentSubmission({ workspaceId, assignmentId: submissionId });
    const parsed = studentSubmissionMoveSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid move");
    }
    const result = await moveSubmissionMember({
      workspaceId,
      assignmentId: submissionId,
      userId: session.user.id,
      toGroupId: parsed.data.toGroupId,
      actor: "student",
      meta,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "student-submission-move");
  }
}
