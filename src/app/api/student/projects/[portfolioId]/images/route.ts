import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { readUpload } from "@/lib/projects/http";
import { addProjectImage } from "@/lib/projects/service";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ portfolioId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-project-image", 30, 60 * 15);
    const params = await context.params;
    const file = await readUpload(request);
    const image = await addProjectImage({
      portfolioId: requireId(params.portfolioId, "Project id"),
      studentId: session.user.id,
      buffer: file.buffer,
      mimeType: file.mimeType,
      fileName: file.fileName,
    });
    return apiSuccess(image);
  } catch (error) {
    return handleApiError(error, "student-project-image");
  }
}
