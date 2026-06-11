import { NextRequest } from "next/server";

import { getServerEnv } from "@/config/env";
import { checkDatabaseHealth } from "@/db";
import { UnauthorizedError } from "@/lib/api/errors";
import { applyCorsHeaders, corsPreflightResponse } from "@/lib/api/cors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { checkEmailHealth } from "@/lib/email";
import { checkRedisHealth } from "@/lib/redis";
import { checkStorageHealth } from "@/lib/storage";

type HealthStatus = "healthy" | "degraded" | "unhealthy";

function resolveOverallStatus(checks: Record<string, { ok: boolean }>): HealthStatus {
  const values = Object.values(checks);
  const allHealthy = values.every((check) => check.ok);
  const anyHealthy = values.some((check) => check.ok);

  if (allHealthy) return "healthy";
  if (anyHealthy) return "degraded";
  return "unhealthy";
}

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const detailed = request.nextUrl.searchParams.get("detailed") === "true";

    if (detailed) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : request.headers.get("x-health-token");

      if (!token || token !== getServerEnv().HEALTH_CHECK_TOKEN) {
        throw new UnauthorizedError("Invalid health check token");
      }

      const [database, redis, storage, email] = await Promise.all([
        checkDatabaseHealth(),
        checkRedisHealth(),
        checkStorageHealth(),
        checkEmailHealth(),
      ]);

      const checks = { database, redis, storage, email };
      const status = resolveOverallStatus(checks);

      const response = apiSuccess({
        status,
        timestamp: new Date().toISOString(),
        environment: getServerEnv().NODE_ENV,
        checks,
      });

      return applyCorsHeaders(response, origin);
    }

    const response = apiSuccess({
      status: "healthy" as const,
      timestamp: new Date().toISOString(),
      service: "inkcuba-api",
    });

    return applyCorsHeaders(response, origin);
  } catch (error) {
    const response = handleApiError(error, "health-check");
    return applyCorsHeaders(response, request.headers.get("origin"));
  }
}
