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
      // Keep connection alive — Upstash free tier drops idle connections after ~300s.
      // Without keepalive, long-running jobs (analyze can take 2-3 min) lose the
      // Redis connection mid-job, causing BullMQ "service is no longer running" errors.
      keepAlive: 30000,
      // Reconnect aggressively if connection drops
      retryStrategy(times: number) {
        const delay = Math.min(times * 500, 5000);
        console.warn(`[redis] Reconnecting attempt ${times} (delay: ${delay}ms)`);
        return delay;
      },
    });

    // Diagnostic logging for Redis connection lifecycle
    connection.on("connect", () => {
      console.log("[redis] Connected");
    });
    connection.on("ready", () => {
      console.log("[redis] Ready");
    });
    connection.on("error", (err) => {
      console.error("[redis] Connection error:", err.message);
    });
    connection.on("close", () => {
      console.warn("[redis] Connection closed");
    });
    connection.on("reconnecting", () => {
      console.warn("[redis] Reconnecting...");
    });
    connection.on("end", () => {
      console.warn("[redis] Connection ended (will not reconnect)");
    });
  }
  return connection;
}
