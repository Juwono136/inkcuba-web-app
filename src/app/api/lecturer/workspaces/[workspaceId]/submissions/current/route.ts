import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { lecturerGuard, requireId } from "@/lib/workspaces/submissions/http";
import { getLecturerCurrentSubmission } from "@/lib/workspaces/submissions";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await lecturerGuard(request, "lecturer-submissions-current");
    const workspaceId = requireId((await context.params).workspaceId, "Workspace id");
    const current = await getLecturerCurrentSubmission({
      workspaceId,
      lecturerId: session.user.id,
    });
    return apiSuccess(current);
  } catch (error) {
    return handleApiError(error, "lecturer-submissions-current");
  }
}
