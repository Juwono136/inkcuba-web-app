import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import {
  patchImportJobItem,
  workspaceImportItemPatchSchema,
} from "@/lib/workspaces/members";
import { requireLecturerApi } from "@/lib/workspaces/require-lecturer-api";

type RouteContext = {
  params: Promise<{ workspaceId: string; jobId: string; itemId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId, jobId, itemId } = await context.params;
    const limit = await rateLimit(
      `lecturer-import-patch:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const body = await request.json().catch(() => null);
    const parsed = workspaceImportItemPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid payload",
      );
    }

    const item = await patchImportJobItem({
      workspaceId,
      lecturerId: session.user.id,
      jobId,
      itemId,
      patch: parsed.data,
    });

    return apiSuccess({ item });
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-import-item-patch");
  }
}
