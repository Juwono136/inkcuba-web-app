import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { listLecturerScoringSubmissions } from "@/lib/projects/moderation";
import { lecturerScoringSubmissionListQuerySchema } from "@/lib/projects/validators";
import { lecturerGuard, requireId } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await lecturerGuard(request, "lecturer-scoring-submissions");
    const params = await context.params;
    const parsed = lecturerScoringSubmissionListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Check the scoring filters");
    }
    const page = await listLecturerScoringSubmissions({
      workspaceId: requireId(params.workspaceId, "Workspace id"),
      lecturerId: session.user.id,
      query: parsed.data,
    });
    return apiSuccess(page);
  } catch (error) {
    return handleApiError(error, "lecturer-scoring-submissions");
  }
}
