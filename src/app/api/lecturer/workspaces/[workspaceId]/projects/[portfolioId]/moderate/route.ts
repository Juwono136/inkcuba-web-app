import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { readIdempotencyKey } from "@/lib/projects/http";
import { lecturerModerateProject } from "@/lib/projects/moderation";
import { lecturerModerateSchema } from "@/lib/projects/validators";
import { lecturerGuard, readJson, requireId } from "@/lib/workspaces/submissions/http";

type RouteContext = { params: Promise<{ workspaceId: string; portfolioId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session, meta } = await lecturerGuard(request, "lecturer-project-moderate", 40, 60 * 15);
    const params = await context.params;
    const parsed = lecturerModerateSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Check the moderation form");
    }
    const result = await lecturerModerateProject({
      workspaceId: requireId(params.workspaceId, "Workspace id"),
      portfolioId: requireId(params.portfolioId, "Project id"),
      lecturerId: session.user.id,
      data: parsed.data,
      idempotencyKey: readIdempotencyKey(request),
      meta,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "lecturer-project-moderate");
  }
}
