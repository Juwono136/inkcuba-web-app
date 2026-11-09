import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { removeProjectImage } from "@/lib/projects/service";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ portfolioId: string; imageId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-project-image-delete", 30, 60 * 15);
    const params = await context.params;
    await removeProjectImage({
      portfolioId: requireId(params.portfolioId, "Project id"),
      imageId: requireId(params.imageId, "Image id"),
      studentId: session.user.id,
    });
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error, "student-project-image-delete");
  }
}
