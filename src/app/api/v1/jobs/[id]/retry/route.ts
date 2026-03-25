import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getUser } from "@/lib/auth/server";
import { ingestQueue } from "@/lib/queue/queues";
import type { JobProgress } from "@/types";

/**
 * POST /api/v1/jobs/:id/retry — Retry a failed job.
 *
 * Resets job status to 'created', clears the error, resets progress,
 * and re-enqueues the ingest step.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const job = await prisma.job.findFirst({
      where: { id, userId: user.id },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "failed" && job.status !== "cancelled") {
      return NextResponse.json(
        { error: "Only failed or cancelled jobs can be retried" },
        { status: 400 },
      );
    }

    const resetProgress: JobProgress = {
      ingest: "pending",
      transcribe: "pending",
      analyze: "pending",
      render: "pending",
    };

    await prisma.job.update({
      where: { id },
      data: {
        status: "created",
        error: null,
        currentStep: null,
        progress: JSON.parse(JSON.stringify(resetProgress)),
        processingStartedAt: null,
        processingCompletedAt: null,
      },
    });

    await ingestQueue().add(
      "ingest",
      {
        jobId: id,
        sourceType: job.sourceType,
        sourceUrl: job.sourceUrl ?? undefined,
        sourceFileKey: job.sourceFileKey ?? undefined,
      },
      { jobId: `ingest-${id}-retry-${Date.now()}` },
    );

    return NextResponse.json({ status: "retrying", jobId: id });
  } catch (error) {
    console.error("[api] POST /api/v1/jobs/:id/retry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
