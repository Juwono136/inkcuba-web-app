import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { assertActiveStudentMember } from "@/lib/workspaces/submissions/access";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";
import { getCurrentSubmission } from "@/lib/workspaces/submissions";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-submissions-current");
    const workspaceId = requireId((await context.params).workspaceId, "Workspace id");
    await assertActiveStudentMember(workspaceId, session.user.id);
    const current = await getCurrentSubmission({ workspaceId });
    return apiSuccess(current);
  } catch (error) {
    return handleApiError(error, "student-submissions-current");
  }
}
