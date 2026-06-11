import { NextRequest } from "next/server";

import { ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { handleApiError } from "@/lib/api/response";
import { fetchObject } from "@/lib/storage/client";

const ALLOWED_PREFIXES = ["avatars/"] as const;

function isAllowedMediaKey(key: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

type RouteContext = {
  params: Promise<{ key: string[] }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { key: keyParts } = await context.params;
    const key = keyParts.join("/");

    if (!key || !isAllowedMediaKey(key)) {
      throw new ForbiddenError("Media access is not allowed for this resource");
    }

    const { body, mimeType } = await fetchObject(key);

    return new Response(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Storage fetch failed: 404")) {
      return handleApiError(new NotFoundError("Media not found"), "media-proxy");
    }

    return handleApiError(error, "media-proxy");
  }
}
