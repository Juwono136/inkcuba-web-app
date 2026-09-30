import "server-only";

import Redis from "ioredis";

import { getServerEnv } from "@/config/env";
import { logger } from "@/lib/logger";

type RedisGlobal = typeof globalThis & {
  __inkcubaRedis?: Redis;
};

const globalStore = globalThis as RedisGlobal;

/**
 * Shared Redis client for the Node process.
 * Survives Next.js HMR and avoids stacking connection/error listeners under load.
 */
export function getRedisClient(): Redis {
  if (globalStore.__inkcubaRedis) {
    return globalStore.__inkcubaRedis;
  }

  const env = getServerEnv();

  const client = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: true,
    // Keep a modest pool for concurrent rate-limit / session-adjacent work
    // without opening unbounded connections under traffic spikes.
    connectTimeout: 10_000,
    retryStrategy(times) {
      if (times > 8) return null;
      return Math.min(times * 200, 3000);
    },
  });

  client.on("error", (error) => {
    logger.error({ err: error }, "Redis connection error");
  });

  client.on("connect", () => {
    logger.debug("Redis connected");
  });

  globalStore.__inkcubaRedis = client;
  return client;
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
