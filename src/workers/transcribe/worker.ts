import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import { QUEUE_CONFIG } from "@/lib/queue/config";
import { handleTranscribeJob } from "./handler";
import type { TranscribeJobData } from "@/types";
import { prisma } from "@/lib/db/client";

export const transcribeWorker = new Worker<TranscribeJobData>(
  "transcribe",
  async (job: Job<TranscribeJobData>) => {
    console.log(`[transcribe] Processing job ${job.id} (db: ${job.data.jobId})`);
    await handleTranscribeJob(job.data);
  },
  {
    connection: getRedisConnection(),
    concurrency: QUEUE_CONFIG.transcribe.concurrency,
  },
);

transcribeWorker.on("completed", (job) => {
  console.log(`[transcribe] Job ${job.id} completed`);
});

transcribeWorker.on("failed", async (job, error) => {
  console.error(`[transcribe] Job ${job?.id} failed:`, error.message);

  if (job && job.attemptsMade >= (job.opts.attempts ?? 2)) {
    await prisma.job
      .update({
        where: { id: job.data.jobId },
        data: {
          status: "failed",
          error: `Transcription failed after ${job.attemptsMade} attempts: ${error.message}`,
        },
      })
      .catch(() => {});
  }
});
