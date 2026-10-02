import { NextRequest } from "next/server";

import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import { requireApiSession } from "@/lib/settings/require-api-session";
import { listStudentWorkspaces } from "@/lib/workspaces/student-service";

export async function GET(request: NextRequest) {
  try {
    const { session, role } = await requireApiSession();
    if (role !== "STUDENT") {
      throw new ForbiddenError("Student access required");
    }

    const limit = await rateLimit(
      `student-workspaces-list:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const { searchParams } = request.nextUrl;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "12");
    const q = searchParams.get("q") ?? "";

    const data = await listStudentWorkspaces({
      studentId: session.user.id,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 12,
      q,
    });

    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error, "student-workspaces-list");
  }
}
