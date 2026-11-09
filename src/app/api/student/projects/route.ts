import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { projectListQuerySchema } from "@/lib/projects/validators";
import { listStudentProjects } from "@/lib/projects/service";
import { studentGuard } from "@/lib/workspaces/submissions/http";

export async function GET(request: NextRequest) {
  try {
    const { session } = await studentGuard(request, "student-project-list");
    const { searchParams } = new URL(request.url);
    const parsed = projectListQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortDir: searchParams.get("sortDir") ?? undefined,
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    const page = await listStudentProjects({
      studentId: session.user.id,
      query: parsed.data,
    });
    return apiSuccess(page);
  } catch (error) {
    return handleApiError(error, "student-project-list");
  }
}
