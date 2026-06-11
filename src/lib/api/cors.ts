import { NextResponse } from "next/server";

import { clientEnv } from "@/config/env-client";

const allowedOrigins = new Set([
  clientEnv.NEXT_PUBLIC_APP_URL,
  clientEnv.NEXT_PUBLIC_SITE_URL,
]);

export function applyCorsHeaders(
  response: Response,
  origin: string | null,
): Response {
  if (origin && allowedOrigins.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );
    response.headers.set("Vary", "Origin");
  }

  return response;
}

export function corsPreflightResponse(origin: string | null): Response {
  const response = new NextResponse(null, { status: 204 });
  return applyCorsHeaders(response, origin);
}
