import { prisma } from "@/lib/db/client";

/**
 * GET /api/v1/jobs/:id/stream — Server-Sent Events endpoint for real-time job progress.
 *
 * Polls the database every 2 seconds and streams progress updates.
 * Closes when job reaches a terminal state (complete, failed, cancelled).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: jobId } = await params;

  // Verify job exists
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true },
  });

  if (!job) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const TERMINAL_STATES = ["complete", "failed", "cancelled"];
  const POLL_INTERVAL_MS = 2000;
  const MAX_DURATION_MS = 600_000; // 10 minutes max

  const encoder = new TextEncoder();
  let lastProgressJson = "";

  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();

      const sendEvent = (event: string, data: unknown): void => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const poll = async (): Promise<void> => {
        try {
          const currentJob = await prisma.job.findUnique({
            where: { id: jobId },
            select: {
              status: true,
              currentStep: true,
              progress: true,
              error: true,
              clipCount: true,
              textOutputCount: true,
              sourceTitle: true,
            },
          });

          if (!currentJob) {
            sendEvent("error", { message: "Job not found" });
            controller.close();
            return;
          }

          // Only send if progress changed
          const progressJson = JSON.stringify(currentJob);
          if (progressJson !== lastProgressJson) {
            lastProgressJson = progressJson;
            sendEvent("progress", currentJob);
          }

          // Close on terminal state
          if (TERMINAL_STATES.includes(currentJob.status)) {
            if (currentJob.status === "failed" || currentJob.status === "cancelled") {
              sendEvent("error", {
                message: currentJob.error ?? `Job ${currentJob.status}`,
                status: currentJob.status,
              });
            } else {
              sendEvent("done", {
                status: currentJob.status,
                clipCount: currentJob.clipCount,
                textOutputCount: currentJob.textOutputCount,
              });
            }
            controller.close();
            return;
          }

          // Timeout protection
          if (Date.now() - startTime > MAX_DURATION_MS) {
            sendEvent("timeout", { message: "Stream timed out" });
            controller.close();
            return;
          }

          // Schedule next poll
          setTimeout(() => {
            poll().catch(() => {
              controller.close();
            });
          }, POLL_INTERVAL_MS);
        } catch (error) {
          sendEvent("error", {
            message:
              error instanceof Error ? error.message : "Unknown error",
          });
          controller.close();
        }
      };

      // Send initial keepalive
      sendEvent("connected", { jobId });
      await poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
