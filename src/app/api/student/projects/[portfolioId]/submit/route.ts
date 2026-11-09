import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { readIdempotencyKey } from "@/lib/projects/http";
import { submitStudentProject } from "@/lib/projects/service";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ portfolioId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await studentGuard(request, "student-project-submit", 20, 60 * 15);
    const params = await context.params;
    const result = await submitStudentProject({
      portfolioId: requireId(params.portfolioId, "Project id"),
      studentId: session.user.id,
      idempotencyKey: readIdempotencyKey(request),
      meta,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "student-project-submit");
  }
}
