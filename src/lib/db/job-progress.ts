import { prisma } from "./client";
import type { JobProgress, StepStatus } from "@/types";

/**
 * Update the progress JSONB column on a job record.
 * Workers call this at each meaningful step for real-time dashboard display.
 */
export async function updateJobProgress(
  jobId: string,
  step: "ingest" | "transcribe" | "analyze" | "render",
  status: StepStatus,
  details?: Record<string, unknown>,
): Promise<void> {
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  const progress = (job.progress ?? {}) as Record<string, unknown>;

  const updated: JobProgress = {
    ingest: (progress.ingest as StepStatus) ?? "pending",
    transcribe: (progress.transcribe as StepStatus) ?? "pending",
    analyze: (progress.analyze as StepStatus) ?? "pending",
    render: (progress.render as StepStatus) ?? "pending",
    details: (progress.details as JobProgress["details"]) ?? {},
  };

  updated[step] = status;
  if (details && updated.details) {
    updated.details = { ...updated.details, ...details };
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      progress: JSON.parse(JSON.stringify(updated)),
      currentStep: `${step}:${status}`,
    },
  });
}

/**
 * Update job status and optionally set error message.
 */
export async function updateJobStatus(
  jobId: string,
  status: "created" | "ingesting" | "transcribing" | "analyzing" | "rendering" | "complete" | "failed" | "cancelled",
  error?: string,
): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status,
      error: error ?? null,
      ...(status === "ingesting" && !error
        ? { processingStartedAt: new Date() }
        : {}),
      ...(status === "complete"
        ? { processingCompletedAt: new Date() }
        : {}),
    },
  });
}
