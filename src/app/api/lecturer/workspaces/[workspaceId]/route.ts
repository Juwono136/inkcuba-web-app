import { NextRequest } from "next/server";
import { z } from "zod";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import {
  getLecturerWorkspaceDetail,
  hardDeleteLecturerWorkspace,
  requireLecturerApi,
  softDeleteLecturerWorkspace,
  updateLecturerWorkspace,
  workspaceUpdateSchema,
} from "@/lib/workspaces";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

const softDeleteBodySchema = z.object({
  confirmName: z.string().trim().min(1).max(200),
});

function clientMeta(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId } = await context.params;

    const limit = await rateLimit(
      `lecturer-workspace-get:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError(
        "Too many requests. Please wait a moment and try again.",
      );
    }

    if (!workspaceId?.trim()) {
      throw new ValidationError("Workspace id is required");
    }

    const workspace = await getLecturerWorkspaceDetail({
      workspaceId,
      lecturerId: session.user.id,
    });

    return apiSuccess({ workspace });
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-get");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId } = await context.params;

    const limit = await rateLimit(
      `lecturer-workspace-patch:${session.user.id}`,
      40,
      60 * 15,
    );
    if (!limit.success) {
      throw new ValidationError(
        "Too many requests. Please wait a moment and try again.",
      );
    }

    if (!workspaceId?.trim()) {
      throw new ValidationError("Workspace id is required");
    }

    const body = await request.json().catch(() => null);
    const parsed = workspaceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid update payload",
        parsed.error.flatten(),
      );
    }

    const meta = clientMeta(request);
    const workspace = await updateLecturerWorkspace({
      workspaceId,
      lecturerId: session.user.id,
      data: parsed.data,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ workspace });
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-patch");
  }
}

/**
 * Soft-delete by default (move to trash). Pass `?hard=true` + confirmName
 * to permanently purge a workspace that is already in trash.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId } = await context.params;

    const limit = await rateLimit(
      `lecturer-workspace-delete:${session.user.id}`,
      20,
      60 * 15,
    );
    if (!limit.success) {
      throw new ValidationError(
        "Too many requests. Please wait a moment and try again.",
      );
    }

    if (!workspaceId?.trim()) {
      throw new ValidationError("Workspace id is required");
    }

    const hard = request.nextUrl.searchParams.get("hard") === "true";
    const body = await request.json().catch(() => null);
    const parsed = softDeleteBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ??
          "Type the workspace name to confirm deletion",
      );
    }

    const meta = clientMeta(request);

    if (hard) {
      await hardDeleteLecturerWorkspace({
        workspaceId,
        lecturerId: session.user.id,
        confirmName: parsed.data.confirmName,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      return apiSuccess({ deleted: true, hard: true });
    }

    await softDeleteLecturerWorkspace({
      workspaceId,
      lecturerId: session.user.id,
      confirmName: parsed.data.confirmName,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ deleted: true, hard: false });
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-delete");
  }
}
