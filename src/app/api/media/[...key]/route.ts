import { NextRequest } from "next/server";

import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { handleApiError } from "@/lib/api/response";
import { assertCanReadProjectMedia } from "@/lib/projects/media-access";
import { fetchObject } from "@/lib/storage/client";

const PUBLIC_PREFIXES = ["avatars/", "workspaces/"] as const;

function isPublicMediaKey(key: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => key.startsWith(prefix));
}

type RouteContext = {
  params: Promise<{ key: string[] }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { key: keyParts } = await context.params;
    const key = keyParts.join("/");

    if (!key) {
      throw new ForbiddenError("Media access is not allowed for this resource");
    }

    if (key.startsWith("projects/")) {
      await assertCanReadProjectMedia(key);
    } else if (!isPublicMediaKey(key)) {
      throw new ForbiddenError("Media access is not allowed for this resource");
    }

    const { body, mimeType } = await fetchObject(key);
    const isProjectDoc =
      key.startsWith("projects/") &&
      (key.includes("/docs/") || key.includes("/additional/") || mimeType === "image/svg+xml");

    return new Response(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": key.startsWith("projects/")
          ? "private, max-age=3600"
          : "public, max-age=86400, stale-while-revalidate=604800",
        ...(isProjectDoc
          ? {
              "Content-Disposition": `inline; filename="${key.split("/").pop() ?? "file"}"`,
              "X-Content-Type-Options": "nosniff",
            }
          : { "X-Content-Type-Options": "nosniff" }),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Storage fetch failed: 404")) {
      return handleApiError(new NotFoundError("Media not found"), "media-proxy");
    }

    return handleApiError(error, "media-proxy");
  }
}
