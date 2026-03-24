import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/v1/jobs/:id — Get job status, metadata, and progress.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        transcript: {
          select: {
            id: true,
            language: true,
            durationSeconds: true,
            wordCount: true,
            confidenceAvg: true,
            engine: true,
            speakers: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            clips: true,
            textOutputs: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: job.id,
      userId: job.userId,
      sourceType: job.sourceType,
      sourceUrl: job.sourceUrl,
      sourceFileKey: job.sourceFileKey,
      sourceTitle: job.sourceTitle,
      sourceDurationSeconds: job.sourceDurationSeconds,
      sourceMetadata: job.sourceMetadata,
      status: job.status,
      currentStep: job.currentStep,
      progress: job.progress,
      error: job.error,
      clipCount: job._count.clips,
      textOutputCount: job._count.textOutputs,
      minutesConsumed: job.minutesConsumed,
      transcript: job.transcript
        ? {
            id: job.transcript.id,
            language: job.transcript.language,
            durationSeconds: job.transcript.durationSeconds,
            wordCount: job.transcript.wordCount,
            confidenceAvg: job.transcript.confidenceAvg,
            engine: job.transcript.engine,
            speakerCount: Array.isArray(job.transcript.speakers)
              ? (job.transcript.speakers as unknown[]).length
              : 0,
          }
        : null,
      processingStartedAt: job.processingStartedAt?.toISOString() ?? null,
      processingCompletedAt: job.processingCompletedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error(`[api] GET /api/v1/jobs error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
