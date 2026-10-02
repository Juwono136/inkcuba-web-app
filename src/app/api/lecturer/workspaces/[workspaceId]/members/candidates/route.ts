import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import {
  searchWorkspaceCandidates,
  workspaceCandidatesQuerySchema,
} from "@/lib/workspaces/members";
import { requireLecturerApi } from "@/lib/workspaces/require-lecturer-api";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId } = await context.params;
    const limit = await rateLimit(
      `lecturer-members-candidates:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const { searchParams } = new URL(request.url);
    const parsed = workspaceCandidatesQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid query",
      );
    }

    const page = await searchWorkspaceCandidates({
      workspaceId,
      lecturerId: session.user.id,
      query: parsed.data,
    });
    return apiSuccess(page);
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-members-candidates");
  }
}
