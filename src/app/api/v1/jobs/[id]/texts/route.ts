import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/v1/jobs/:id/texts — List all text outputs for a job.
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

    const texts = await prisma.textOutput.findMany({
      where: { jobId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        type: true,
        label: true,
        content: true,
        wordCount: true,
        threadPosts: true,
        status: true,
        metadata: true,
        sortOrder: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      texts,
      total: texts.length,
    });
  } catch (error) {
    console.error("[api] GET /api/v1/jobs/[id]/texts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
