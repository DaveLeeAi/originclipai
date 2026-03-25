import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getUser } from "@/lib/auth/server";
import { getStorageProvider } from "@/lib/providers/storage-supabase";

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

/**
 * DELETE /api/v1/jobs/:id — Delete a job and all related records.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const job = await prisma.job.findUnique({
      where: { id },
      select: { userId: true, sourceFileKey: true },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 },
      );
    }

    if (job.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    // Delete DB records
    await prisma.$transaction([
      prisma.clip.deleteMany({ where: { jobId: id } }),
      prisma.textOutput.deleteMany({ where: { jobId: id } }),
      prisma.transcript.deleteMany({ where: { jobId: id } }),
      prisma.job.delete({ where: { id } }),
    ]);

    // Clean up storage files (best-effort, don't block response)
    try {
      const storage = getStorageProvider();
      // Delete the job's folder (source file + any rendered clips)
      await storage.delete(`jobs/${id}`);
      if (job.sourceFileKey) {
        await storage.delete(job.sourceFileKey);
      }
    } catch (storageErr) {
      console.warn(`[api] Storage cleanup failed for job ${id}:`, storageErr);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`[api] DELETE /api/v1/jobs error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

const patchJobSchema = z.object({
  status: z.enum(["cancelled"]),
});

/**
 * PATCH /api/v1/jobs/:id — Update job status (currently: cancel only).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body: unknown = await request.json();
    const input = patchJobSchema.parse(body);

    const job = await prisma.job.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 },
      );
    }

    if (job.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    // Only allow cancellation of jobs that are not already terminal
    const terminalStatuses = ["complete", "failed", "cancelled"];
    if (terminalStatuses.includes(job.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a job with status "${job.status}"` },
        { status: 409 },
      );
    }

    await prisma.job.update({
      where: { id },
      data: {
        status: input.status,
        error: "Cancelled by user",
      },
    });

    return NextResponse.json({ id, status: input.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    console.error(`[api] PATCH /api/v1/jobs error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
