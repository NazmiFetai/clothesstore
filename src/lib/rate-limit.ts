// src/lib/rate-limit.ts
import type { RedisClientType } from "redis";
import { getRedis } from "./redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number | null;
};

/**
 * Simple fixed-window rate limit using Redis INCR + EXPIRE.
 *
 * keyBase: logical key, e.g. "products_search:IP"
 * limit: max requests per window
 * windowSeconds: window length in seconds
 */
export async function checkRateLimit(
  keyBase: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redis: RedisClientType | null = await getRedis();
  if (!redis) {
    // No Redis -> no rate limit (still returns something sane)
    return {
      allowed: true,
      remaining: limit,
      retryAfterSeconds: null,
    };
  }

  const key = `ratelimit:${keyBase}`;

  // increment counter
  const count = await redis.incr(key);

  if (count === 1) {
    // first hit in this window -> set TTL
    await redis.expire(key, windowSeconds);
  }

  // get TTL so we can tell the client when to retry
  const ttl = await redis.ttl(key);

  if (count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(limit - count, 0),
    retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
  };
}
