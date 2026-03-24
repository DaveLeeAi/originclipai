import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import { QUEUE_CONFIG } from "@/lib/queue/config";
import { handleIngestJob } from "./handler";
import type { IngestJobData } from "@/types";
import { prisma } from "@/lib/db/client";

export const ingestWorker = new Worker<IngestJobData>(
  "ingest",
  async (job: Job<IngestJobData>) => {
    console.log(`[ingest] Processing job ${job.id} (db: ${job.data.jobId})`);
    await handleIngestJob(job.data);
  },
  {
    connection: getRedisConnection(),
    concurrency: QUEUE_CONFIG.ingest.concurrency,
  },
);

ingestWorker.on("completed", (job) => {
  console.log(`[ingest] Job ${job.id} completed`);
});

ingestWorker.on("failed", async (job, error) => {
  console.error(`[ingest] Job ${job?.id} failed:`, error.message);

  // If all retries exhausted, ensure job is marked as permanently failed
  if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
    await prisma.job
      .update({
        where: { id: job.data.jobId },
        data: {
          status: "failed",
          error: `Failed after ${job.attemptsMade} attempts: ${error.message}`,
        },
      })
      .catch(() => {});
  }
});
