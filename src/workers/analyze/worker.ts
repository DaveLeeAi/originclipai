import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import { QUEUE_CONFIG } from "@/lib/queue/config";
import { handleAnalyzeJob } from "./handler";
import type { AnalyzeJobData } from "@/types";
import { prisma } from "@/lib/db/client";

export const analyzeWorker = new Worker<AnalyzeJobData>(
  "analyze",
  async (job: Job<AnalyzeJobData>) => {
    console.log(`[analyze] Processing job ${job.id} (db: ${job.data.jobId})`);
    await handleAnalyzeJob(job.data);
  },
  {
    connection: getRedisConnection(),
    concurrency: QUEUE_CONFIG.analyze.concurrency,
  },
);

analyzeWorker.on("completed", (job) => {
  console.log(`[analyze] Job ${job.id} completed`);
});

analyzeWorker.on("error", (error) => {
  // BullMQ worker-level errors — typically Redis connection issues.
  // "The service is no longer running" is emitted here when Redis disconnects mid-job.
  console.error(`[analyze] Worker error (Redis connection likely lost):`, error.message);
  const mem = process.memoryUsage();
  console.error(
    `[analyze] Worker error memory state: RSS=${Math.round(mem.rss / 1024 / 1024)}MB, Heap=${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
  );
});

analyzeWorker.on("failed", async (job, error) => {
  console.error(`[analyze] Job ${job?.id} failed:`, error.message);

  if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
    await prisma.job
      .update({
        where: { id: job.data.jobId },
        data: {
          status: "failed",
          error: `Analysis failed after ${job.attemptsMade} attempts: ${error.message}`,
        },
      })
      .catch(() => {});
  }
});
