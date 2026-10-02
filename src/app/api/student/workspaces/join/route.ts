import { NextRequest } from "next/server";

import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import { requireApiSession } from "@/lib/settings/require-api-session";
import {
  joinWorkspaceByCode,
  workspaceJoinSchema,
} from "@/lib/workspaces/members";

export async function POST(request: NextRequest) {
  try {
    const { session, role } = await requireApiSession();
    if (role !== "STUDENT") {
      throw new ForbiddenError("Student access required");
    }

    const limit = await rateLimit(
      `student-workspace-join:${session.user.id}`,
      20,
      60 * 15,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const body = await request.json().catch(() => null);
    const parsed = workspaceJoinSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid invite code",
      );
    }

    const result = await joinWorkspaceByCode({
      studentId: session.user.id,
      data: parsed.data,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, "student-workspace-join");
  }
}
