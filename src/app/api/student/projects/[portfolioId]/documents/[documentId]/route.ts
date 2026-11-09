import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { removeProjectDocument } from "@/lib/projects/service";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ portfolioId: string; documentId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-project-document-delete", 30, 60 * 15);
    const params = await context.params;
    await removeProjectDocument({
      portfolioId: requireId(params.portfolioId, "Project id"),
      documentId: requireId(params.documentId, "Document id"),
      studentId: session.user.id,
    });
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error, "student-project-document-delete");
  }
}
