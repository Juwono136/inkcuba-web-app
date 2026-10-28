import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { lecturerGuard, readJson, requireId } from "@/lib/workspaces/submissions/http";
import {
  createLecturerSubmission,
  listLecturerSubmissions,
  submissionListQuerySchema,
  submissionWriteSchema,
} from "@/lib/workspaces/submissions";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await lecturerGuard(request, "lecturer-submissions-list");
    const workspaceId = requireId((await context.params).workspaceId, "Workspace id");
    const { searchParams } = new URL(request.url);
    const parsed = submissionListQuerySchema.safeParse({
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
    const page = await listLecturerSubmissions({
      workspaceId,
      lecturerId: session.user.id,
      query: parsed.data,
    });
    return apiSuccess(page);
  } catch (error) {
    return handleApiError(error, "lecturer-submissions-list");
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await lecturerGuard(
      request,
      "lecturer-submissions-create",
      30,
      60 * 15,
    );
    const workspaceId = requireId((await context.params).workspaceId, "Workspace id");
    const parsed = submissionWriteSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid submission");
    }
    const submission = await createLecturerSubmission({
      workspaceId,
      lecturerId: session.user.id,
      data: parsed.data,
      meta,
    });
    return apiSuccess({ submission });
  } catch (error) {
    return handleApiError(error, "lecturer-submissions-create");
  }
}
