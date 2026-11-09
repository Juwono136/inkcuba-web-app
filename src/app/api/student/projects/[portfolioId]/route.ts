import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { deleteStudentProject, getStudentProject, saveStudentProject } from "@/lib/projects/service";
import { projectWriteSchema } from "@/lib/projects/validators";
import { readJson, requireId, studentGuard } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ portfolioId: string }> };

function readSource(request: NextRequest): "submission" | "lists" {
  const value = request.nextUrl.searchParams.get("source");
  return value === "submission" ? "submission" : "lists";
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-project-read");
    const params = await context.params;
    const project = await getStudentProject({
      portfolioId: requireId(params.portfolioId, "Project id"),
      studentId: session.user.id,
      source: readSource(request),
    });
    return apiSuccess(project);
  } catch (error) {
    return handleApiError(error, "student-project-read");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await studentGuard(request, "student-project-delete", 20, 60 * 15);
    const params = await context.params;
    const result = await deleteStudentProject({
      portfolioId: requireId(params.portfolioId, "Project id"),
      studentId: session.user.id,
      meta,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "student-project-delete");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await studentGuard(request, "student-project-save", 40, 60 * 15);
    const params = await context.params;
    const parsed = projectWriteSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Check the project form");
    }
    const project = await saveStudentProject({
      portfolioId: requireId(params.portfolioId, "Project id"),
      studentId: session.user.id,
      data: parsed.data,
      meta,
    });
    return apiSuccess(project);
  } catch (error) {
    return handleApiError(error, "student-project-save");
  }
}
