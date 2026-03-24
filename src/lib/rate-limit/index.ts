// src/lib/rate-limit/index.ts

/**
 * Redis-based sliding window rate limiter.
 * Used for API endpoints and social platform posting.
 */

import { Redis } from 'ioredis';

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
  }
  return _redis;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

/**
 * Check and consume a rate limit token.
 *
 * @param key - Unique identifier (e.g., `api:${userId}` or `social:${userId}:youtube`)
 * @param limit - Max requests per window
 * @param windowSeconds - Window duration in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;
  const redisKey = `ratelimit:${key}`;

  // Use a sorted set with timestamps as scores
  const pipeline = redis.pipeline();

  // Remove expired entries
  pipeline.zremrangebyscore(redisKey, 0, windowStart);

  // Count current entries
  pipeline.zcard(redisKey);

  // Add current request (optimistically)
  pipeline.zadd(redisKey, now, `${now}:${Math.random()}`);

  // Set TTL on the key
  pipeline.expire(redisKey, windowSeconds + 1);

  const results = await pipeline.exec();
  const currentCount = (results?.[1]?.[1] as number) ?? 0;

  if (currentCount >= limit) {
    // Over limit — remove the entry we just added
    const lastEntry = results?.[2];
    // Get the oldest entry to calculate reset time
    const oldest = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');
    const oldestTime = oldest.length >= 2 ? parseInt(oldest[1]) : now;
    const resetAt = new Date(oldestTime + windowMs);
    const retryAfterSeconds = Math.ceil((resetAt.getTime() - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  return {
    allowed: true,
    remaining: limit - currentCount - 1,
    limit,
    resetAt: new Date(now + windowMs),
  };
}

/**
 * Rate limit configuration per plan.
 */
export const API_RATE_LIMITS: Record<string, { limit: number; windowSeconds: number }> = {
  FREE: { limit: 10, windowSeconds: 60 },      // 10 req/min
  CREATOR: { limit: 30, windowSeconds: 60 },    // 30 req/min
  PRO: { limit: 60, windowSeconds: 60 },        // 60 req/min
  BUSINESS: { limit: 120, windowSeconds: 60 },   // 120 req/min
};

/**
 * Apply rate limiting to an API request.
 * Returns headers to include in the response.
 */
export async function applyApiRateLimit(
  userId: string,
  plan: string,
): Promise<{ allowed: boolean; headers: Record<string, string>; retryAfter?: number }> {
  const config = API_RATE_LIMITS[plan] ?? API_RATE_LIMITS.FREE;
  const result = await checkRateLimit(`api:${userId}`, config.limit, config.windowSeconds);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfterSeconds ?? 60);
  }

  return {
    allowed: result.allowed,
    headers,
    retryAfter: result.retryAfterSeconds,
  };
}
