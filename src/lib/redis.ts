// src/lib/redis.ts
import { createClient, RedisClientType } from "redis";

let client: RedisClientType | null = null;

// Connect (or reuse) Redis client
export async function getRedis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn("[redis] REDIS_URL not set, skipping caching.");
    return null;
  }

  // Reuse if already open
  if (client && client.isOpen) {
    return client;
  }

  client = createClient({ url });

  client.on("error", (err) => {
    console.error("[redis] Client error:", err);
  });

  await client.connect();
  console.log(`Redis connected to ${url}`);
  return client;
}

// Generic GET helper
export async function getCache<T = unknown>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (!redis) return null;

  const raw = await redis.get(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error("[redis] Failed to parse JSON for key", key, e);
    return null;
  }
}

// Generic SET helper
export async function setCache(
  key: string,
  value: unknown,
  ttlSeconds: number = 60,
): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  const json = JSON.stringify(value);
  await redis.set(key, json, { EX: ttlSeconds });
}
