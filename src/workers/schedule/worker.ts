import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import { QUEUE_CONFIG } from "@/lib/queue/config";
import { handleScheduleJob } from "./handler";
import type { ScheduleJobData } from "@/types";
import { prisma } from "@/lib/db/client";

export const scheduleWorker = new Worker<ScheduleJobData>(
  "schedule",
  async (job: Job<ScheduleJobData>) => {
    console.log(
      `[schedule] Processing job ${job.id} (post: ${job.data.scheduledPostId})`,
    );
    await handleScheduleJob(job.data);
  },
  {
    connection: getRedisConnection(),
    concurrency: QUEUE_CONFIG.schedule.concurrency,
  },
);

scheduleWorker.on("completed", (job) => {
  console.log(`[schedule] Job ${job.id} completed`);
});

scheduleWorker.on("failed", async (job, error) => {
  console.error(`[schedule] Job ${job?.id} failed:`, error.message);

  // If all retries exhausted, mark the scheduled post as permanently failed
  if (job && job.attemptsMade >= (job.opts.attempts ?? 4)) {
    await prisma.scheduledPost
      .update({
        where: { id: job.data.scheduledPostId },
        data: {
          status: "failed",
          error: `Failed after ${job.attemptsMade} attempts: ${error.message}`,
        },
      })
      .catch(() => {});
  }
});
