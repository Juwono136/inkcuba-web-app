import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import {
  downloadMembersTemplate,
  loadOwnedWorkspace,
} from "@/lib/workspaces/members";
import { requireLecturerApi } from "@/lib/workspaces/require-lecturer-api";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { session } = await requireLecturerApi();
    const { workspaceId } = await context.params;
    const limit = await rateLimit(
      `lecturer-members-template:${session.user.id}`,
      20,
      60 * 15,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    await loadOwnedWorkspace(workspaceId, session.user.id);
    const { buffer, fileName } = await downloadMembersTemplate();

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, "lecturer-workspace-members-template");
  }
}
