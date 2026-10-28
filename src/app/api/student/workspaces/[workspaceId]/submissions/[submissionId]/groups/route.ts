import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { assertActiveStudentMember } from "@/lib/workspaces/submissions/access";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";
import {
  getStudentSubmission,
  listSubmissionGroups,
  submissionGroupsQuerySchema,
} from "@/lib/workspaces/submissions";

type RouteContext = {
  params: Promise<{ workspaceId: string; submissionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-submission-groups");
    const params = await context.params;
    const workspaceId = requireId(params.workspaceId, "Workspace id");
    const submissionId = requireId(params.submissionId, "Submission id");
    await assertActiveStudentMember(workspaceId, session.user.id);
    await getStudentSubmission({ workspaceId, assignmentId: submissionId });
    const { searchParams } = new URL(request.url);
    const parsed = submissionGroupsQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      unassignedPage: searchParams.get("unassignedPage") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    const groups = await listSubmissionGroups({
      workspaceId,
      assignmentId: submissionId,
      query: parsed.data,
    });
    return apiSuccess(groups);
  } catch (error) {
    return handleApiError(error, "student-submission-groups");
  }
}
