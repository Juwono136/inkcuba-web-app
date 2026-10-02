import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import {
  commitImportJob,
  workspaceImportCommitSchema,
} from "@/lib/workspaces/members";
import { requireLecturerApi } from "@/lib/workspaces/require-lecturer-api";

type RouteContext = {
  params: Promise<{ workspaceId: string; jobId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId, jobId } = await context.params;
    const limit = await rateLimit(
      `lecturer-import-commit:${session.user.id}`,
      10,
      60 * 15,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const body = await request.json().catch(() => ({}));
    const parsed = workspaceImportCommitSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid payload",
      );
    }

    const idempotencyKey =
      request.headers.get("idempotency-key") ??
      parsed.data.idempotencyKey ??
      null;

    const job = await commitImportJob({
      workspaceId,
      lecturerId: session.user.id,
      jobId,
      idempotencyKey,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    });

    return apiSuccess({ job });
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-import-commit");
  }
}
