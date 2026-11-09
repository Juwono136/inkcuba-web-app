import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { readUpload } from "@/lib/projects/http";
import { removeProjectVideo, replaceProjectVideo } from "@/lib/projects/service";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ portfolioId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-project-video", 10, 60 * 15);
    const params = await context.params;
    const file = await readUpload(request);
    const video = await replaceProjectVideo({
      portfolioId: requireId(params.portfolioId, "Project id"),
      studentId: session.user.id,
      buffer: file.buffer,
      mimeType: file.mimeType,
      fileName: file.fileName,
    });
    return apiSuccess(video);
  } catch (error) {
    return handleApiError(error, "student-project-video");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-project-video-delete", 10, 60 * 15);
    const params = await context.params;
    await removeProjectVideo({
      portfolioId: requireId(params.portfolioId, "Project id"),
      studentId: session.user.id,
    });
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error, "student-project-video-delete");
  }
}
