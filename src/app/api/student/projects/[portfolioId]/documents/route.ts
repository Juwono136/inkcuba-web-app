import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { readUpload } from "@/lib/projects/http";
import { addProjectDocument } from "@/lib/projects/service";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ portfolioId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-project-document", 30, 60 * 15);
    const params = await context.params;
    const file = await readUpload(request);
    const document = await addProjectDocument({
      portfolioId: requireId(params.portfolioId, "Project id"),
      studentId: session.user.id,
      role: file.role,
      buffer: file.buffer,
      mimeType: file.mimeType,
      fileName: file.fileName,
    });
    return apiSuccess(document);
  } catch (error) {
    return handleApiError(error, "student-project-document");
  }
}
