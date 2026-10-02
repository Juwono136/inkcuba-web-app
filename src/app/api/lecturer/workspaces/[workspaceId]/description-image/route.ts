import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import {
  requireLecturerApi,
  uploadDescriptionImageForWorkspace,
} from "@/lib/workspaces";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId } = await context.params;

    const limit = await rateLimit(
      `lecturer-workspace-desc-img:${session.user.id}`,
      30,
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
      throw new ValidationError("Image file is required");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadDescriptionImageForWorkspace({
      workspaceId,
      lecturerId: session.user.id,
      file: {
        fileName: file.name || "image.jpg",
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        buffer,
      },
    });

    return apiSuccess(uploaded);
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-description-image");
  }
}
