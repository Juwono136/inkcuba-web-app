import { toNextJsHandler } from "better-auth/next-js";

import { applyCorsHeaders, corsPreflightResponse } from "@/lib/api/cors";
import { getAuth } from "@/lib/auth/auth";
import { enforceAuthRateLimit } from "@/lib/auth/rate-limit";

function getHandler() {
  return toNextJsHandler(getAuth());
}

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request.headers.get("origin"));
}

export async function GET(request: Request) {
  const response = await getHandler().GET(request);
  return applyCorsHeaders(response, request.headers.get("origin"));
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceAuthRateLimit(request);
  if (rateLimitResponse) {
    return applyCorsHeaders(rateLimitResponse, request.headers.get("origin"));
  }

  const response = await getHandler().POST(request);
  return applyCorsHeaders(response, request.headers.get("origin"));
}
