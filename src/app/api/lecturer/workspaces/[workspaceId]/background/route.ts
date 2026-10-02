import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import {
  removeWorkspaceBackground,
  requireLecturerApi,
  setWorkspaceBackground,
} from "@/lib/workspaces";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

function clientMeta(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId } = await context.params;

    const limit = await rateLimit(
      `lecturer-workspace-bg:${session.user.id}`,
      15,
      60 * 15,
    );
    if (!limit.success) {
      throw new ValidationError(
        "Too many upload attempts. Please try again later.",
      );
    }

    if (!workspaceId?.trim()) {
      throw new ValidationError("Workspace id is required");
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError("Background image is required");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = clientMeta(request);

    const workspace = await setWorkspaceBackground({
      workspaceId,
      lecturerId: session.user.id,
      file: {
        fileName: file.name || "background.jpg",
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        buffer,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ workspace });
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-background-post");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId } = await context.params;

    const limit = await rateLimit(
      `lecturer-workspace-bg-del:${session.user.id}`,
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

    const meta = clientMeta(request);
    const workspace = await removeWorkspaceBackground({
      workspaceId,
      lecturerId: session.user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ workspace });
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-background-delete");
  }
}
