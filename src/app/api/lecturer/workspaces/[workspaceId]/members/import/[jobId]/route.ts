import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import { listImportJobItems } from "@/lib/workspaces/members";
import { requireLecturerApi } from "@/lib/workspaces/require-lecturer-api";

type RouteContext = {
  params: Promise<{ workspaceId: string; jobId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId, jobId } = await context.params;
    const limit = await rateLimit(
      `lecturer-import-get:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "50");

    const result = await listImportJobItems({
      workspaceId,
      lecturerId: session.user.id,
      jobId,
      page,
      pageSize,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-import-get");
  }
}
