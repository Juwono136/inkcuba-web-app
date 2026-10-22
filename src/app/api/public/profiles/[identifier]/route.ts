import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { getPublicProfileByIdentifier } from "@/lib/profiles/public-profile";
import { rateLimit } from "@/lib/redis";

type RouteContext = { params: Promise<{ identifier: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "anon";
    const limit = await rateLimit(`public-profile:${ip}`, 60, 60);
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const { identifier } = await context.params;
    const profile = await getPublicProfileByIdentifier(identifier);
    return apiSuccess(profile);
  } catch (error) {
    return handleApiError(error, "public-profile");
  }
}
