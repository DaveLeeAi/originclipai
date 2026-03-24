import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/v1/jobs/:id/clips — List all clip candidates for a job.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: jobId } = await params;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const clips = await prisma.clip.findMany({
      where: { jobId },
      orderBy: [{ score: "desc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        startTime: true,
        endTime: true,
        duration: true,
        title: true,
        hook: true,
        transcriptExcerpt: true,
        score: true,
        scoreFactors: true,
        primarySpeakerId: true,
        speakerRole: true,
        speakersPresent: true,
        status: true,
        socialCaption: true,
        hashtags: true,
        sortOrder: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      clips,
      total: clips.length,
    });
  } catch (error) {
    console.error("[api] GET /api/v1/jobs/[id]/clips error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
