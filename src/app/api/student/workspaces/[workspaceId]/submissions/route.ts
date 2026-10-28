import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { assertActiveStudentMember } from "@/lib/workspaces/submissions/access";
import { requireId, studentGuard } from "@/lib/workspaces/submissions/http";
import {
  listStudentSubmissions,
  studentSubmissionListQuerySchema,
} from "@/lib/workspaces/submissions";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await studentGuard(request, "student-submissions-list");
    const workspaceId = requireId((await context.params).workspaceId, "Workspace id");
    await assertActiveStudentMember(workspaceId, session.user.id);
    const { searchParams } = new URL(request.url);
    const parsed = studentSubmissionListQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortDir: searchParams.get("sortDir") ?? undefined,
    });
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid query");
    }
    const page = await listStudentSubmissions({
      workspaceId,
      query: parsed.data,
    });
    return apiSuccess(page);
  } catch (error) {
    return handleApiError(error, "student-submissions-list");
  }
}
