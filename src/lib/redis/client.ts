import "server-only";

import Redis from "ioredis";

import { getServerEnv } from "@/config/env";
import { logger } from "@/lib/logger";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const env = getServerEnv();
    redis = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });

    redis.on("error", (error) => {
      logger.error({ err: error }, "Redis connection error");
    });

    redis.on("connect", () => {
      logger.debug("Redis connected");
    });
  }

  return redis;
}

export async function checkRedisHealth(): Promise<{
  ok: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const client = getRedisClient();

  try {
    if (client.status !== "ready") {
      await client.connect();
    }

    const start = Date.now();
    const pong = await client.ping();
    const latencyMs = Date.now() - start;

    return { ok: pong === "PONG", latencyMs };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Redis health check failed",
    };
  }
}
