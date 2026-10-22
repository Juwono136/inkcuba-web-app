import { NextRequest } from "next/server";

import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import { requireApiSession } from "@/lib/settings/require-api-session";
import { workspaceMembersListQuerySchema } from "@/lib/workspaces/members";
import { listStudentWorkspacePeople } from "@/lib/workspaces/student-service";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session, role } = await requireApiSession();
    if (role !== "STUDENT") {
      throw new ForbiddenError("Student access required");
    }

    const { workspaceId } = await context.params;
    const limit = await rateLimit(
      `student-workspace-people:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const { searchParams } = new URL(request.url);
    const parsed = workspaceMembersListQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid query",
      );
    }

    const page = await listStudentWorkspacePeople({
      studentId: session.user.id,
      workspaceId,
      query: parsed.data,
    });

    return apiSuccess(page);
  } catch (error) {
    return handleApiError(error, "student-workspace-people");
  }
}
