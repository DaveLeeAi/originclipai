import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/v1/jobs/:id/texts — List all text outputs for a job.
 *
 * Query params:
 *   type — filter by TextOutputType (e.g., "key_insight", "notable_quote", "summary")
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: jobId } = await params;
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const where: Prisma.TextOutputWhereInput = { jobId };
    if (typeFilter) {
      // Cast validated at DB layer — invalid types return empty results
      where.type = typeFilter as Prisma.TextOutputWhereInput["type"];
    }

    const texts = await prisma.textOutput.findMany({
      where,
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
