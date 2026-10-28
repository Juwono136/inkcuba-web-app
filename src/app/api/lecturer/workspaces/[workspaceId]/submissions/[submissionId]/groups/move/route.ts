import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { loadOwnedWorkspace } from "@/lib/workspaces/submissions/access";
import { lecturerGuard, readJson, requireId } from "@/lib/workspaces/submissions/http";
import { moveSubmissionMember, submissionMoveSchema } from "@/lib/workspaces/submissions";

type RouteContext = {
  params: Promise<{ workspaceId: string; submissionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await lecturerGuard(
      request,
      "lecturer-submission-group-move",
      80,
      60,
    );
    const params = await context.params;
    const workspaceId = requireId(params.workspaceId, "Workspace id");
    await loadOwnedWorkspace(workspaceId, session.user.id);
    const parsed = submissionMoveSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid move");
    }
    const result = await moveSubmissionMember({
      workspaceId,
      assignmentId: requireId(params.submissionId, "Submission id"),
      userId: parsed.data.userId,
      toGroupId: parsed.data.toGroupId,
      actor: "lecturer",
      meta,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "lecturer-submission-group-move");
  }
}
