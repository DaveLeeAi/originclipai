import IORedis from "ioredis";

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is required");
    }
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      tls: redisUrl.startsWith("rediss://") ? {} : undefined,
      enableReadyCheck: false,
      connectTimeout: 10000,
    });
  }
  return connection;
}
