import "server-only";

import { getServerEnv } from "@/config/env";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/redis";

const SENSITIVE_AUTH_PATHS = [
  "/api/auth/sign-in/email",
  "/api/auth/sign-up/email",
  "/api/auth/forget-password",
  "/api/auth/reset-password",
];

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function enforceAuthRateLimit(
  request: Request,
): Promise<Response | null> {
  if (!getServerEnv().AUTH_LOCKOUT_ENABLED) return null;

  const { pathname } = new URL(request.url);
  const isSensitive = SENSITIVE_AUTH_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  if (!isSensitive || request.method !== "POST") return null;

  const ip = getClientIp(request);
  const limit = await rateLimit(`auth:${ip}`, 20, 60 * 15);

  if (!limit.success) {
    logger.warn({ ip, pathname }, "Auth rate limit exceeded");
    return Response.json(
      {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many authentication attempts. Try again later.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((limit.resetAt - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  return null;
}
