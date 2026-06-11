import "server-only";

import { getRedisClient } from "@/lib/redis/client";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`;

  const count = await redis.incr(windowKey);

  if (count === 1) {
    await redis.expire(windowKey, windowSeconds);
  }

  const remaining = Math.max(0, limit - count);
  const resetAt = Math.ceil(now / (windowSeconds * 1000)) * windowSeconds * 1000;

  return {
    success: count <= limit,
    limit,
    remaining,
    resetAt,
  };
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  const value = await redis.get(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  const redis = getRedisClient();
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(key);
}
