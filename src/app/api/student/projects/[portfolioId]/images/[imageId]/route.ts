import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { readUpload } from "@/lib/projects/http";
import { removeProjectImage, replaceProjectImage } from "@/lib/projects/service";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ portfolioId: string; imageId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-project-image-replace", 30, 60 * 15);
    const params = await context.params;
    const file = await readUpload(request);
    const image = await replaceProjectImage({
      portfolioId: requireId(params.portfolioId, "Project id"),
      imageId: requireId(params.imageId, "Image id"),
      studentId: session.user.id,
      buffer: file.buffer,
      mimeType: file.mimeType,
      fileName: file.fileName,
    });
    return apiSuccess(image);
  } catch (error) {
    return handleApiError(error, "student-project-image-replace");
  }
}

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
