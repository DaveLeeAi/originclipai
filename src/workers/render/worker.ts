import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import { QUEUE_CONFIG } from "@/lib/queue/config";
import { handleRenderJob } from "./handler";
import type { RenderJobData } from "@/types";
import { prisma } from "@/lib/db/client";

export const renderWorker = new Worker<RenderJobData>(
  "render",
  async (job: Job<RenderJobData>) => {
    console.log(
      `[render] Processing clip ${job.data.clipId} (job: ${job.data.jobId})`,
    );
    await handleRenderJob(job.data);
  },
  {
    connection: getRedisConnection(),
    concurrency: QUEUE_CONFIG.render.concurrency,
  },
);

renderWorker.on("completed", (job) => {
  console.log(`[render] Clip ${job.data.clipId} render completed`);
});

renderWorker.on("failed", async (job, error) => {
  console.error(
    `[render] Clip ${job?.data.clipId} render failed:`,
    error.message,
  );

  // If all retries exhausted, mark clip as permanently failed
  if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
    await prisma.clip
      .update({
        where: { id: job.data.clipId },
        data: {
          renderStatus: "failed",
        },
      })
      .catch(() => {});

    // Check if this was the last clip — if so, update job status
    const { jobId } = job.data;
    const totalClips = await prisma.clip.count({ where: { jobId } }).catch(() => 0);
    const doneClips = await prisma.clip
      .count({
        where: {
          jobId,
          renderStatus: { in: ["complete", "failed"] },
        },
      })
      .catch(() => 0);

    if (doneClips >= totalClips && totalClips > 0) {
      const renderedOk = await prisma.clip
        .count({ where: { jobId, renderStatus: "complete" } })
        .catch(() => 0);

      if (renderedOk === 0) {
        await prisma.job
          .update({
            where: { id: jobId },
            data: {
              status: "failed",
              error: `All clips failed to render after retries`,
            },
          })
          .catch(() => {});
      } else {
        await prisma.job
          .update({
            where: { id: jobId },
            data: {
              status: "complete",
              processingCompletedAt: new Date(),
            },
          })
          .catch(() => {});
      }
    }
  }
});
