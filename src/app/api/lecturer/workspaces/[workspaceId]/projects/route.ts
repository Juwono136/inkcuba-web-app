import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { listLecturerWorkspaceProjects } from "@/lib/projects/moderation";
import { lecturerProjectListQuerySchema } from "@/lib/projects/validators";
import { lecturerGuard, requireId } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await lecturerGuard(request, "lecturer-workspace-projects");
    const params = await context.params;
    const parsed = lecturerProjectListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Check the project filters");
    }
    const page = await listLecturerWorkspaceProjects({
      workspaceId: requireId(params.workspaceId, "Workspace id"),
      lecturerId: session.user.id,
      query: {
        ...parsed.data,
        submissionId: parsed.data.submissionId || undefined,
      },
    });
    return apiSuccess(page);
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-projects");
  }
}
