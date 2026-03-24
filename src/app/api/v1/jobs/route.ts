import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { ingestQueue } from "@/lib/queue/queues";
import { createJobSchema } from "@/lib/utils/validation";
import type { JobProgress } from "@/types";

/**
 * POST /api/v1/jobs — Create a new processing job.
 *
 * Validates input, creates a job record, enqueues the ingest step.
 * Returns the job ID immediately — polling via GET /api/v1/jobs/:id for status.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const input = createJobSchema.parse(body);

    // TODO: Phase 3 — authenticate request and check billing limits
    // For Phase 1 headless testing, use a default user ID
    const userId = request.headers.get("x-user-id") ?? process.env.DEFAULT_USER_ID;
    if (!userId) {
      return NextResponse.json(
        { error: "x-user-id header or DEFAULT_USER_ID env var required" },
        { status: 401 },
      );
    }

    // Ensure user profile exists
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });
    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    // Create job record
    const initialProgress: JobProgress = {
      ingest: "pending",
      transcribe: "pending",
      analyze: "pending",
      render: "pending",
    };

    const job = await prisma.job.create({
      data: {
        userId,
        sourceType: input.sourceType,
        sourceUrl: "sourceUrl" in input ? input.sourceUrl : null,
        sourceFileKey: "sourceFileKey" in input ? input.sourceFileKey : null,
        status: "created",
        progress: JSON.parse(JSON.stringify(initialProgress)),
      },
    });

    // Enqueue ingest job
    await ingestQueue().add(
      "ingest",
      {
        jobId: job.id,
        sourceType: input.sourceType,
        sourceUrl: "sourceUrl" in input ? input.sourceUrl : undefined,
        sourceFileKey: "sourceFileKey" in input ? input.sourceFileKey : undefined,
      },
      {
        jobId: `ingest-${job.id}`,
      },
    );

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 },
      );
    }

    console.error("[api] POST /api/v1/jobs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/v1/jobs — List jobs for a user.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const userId = request.headers.get("x-user-id") ?? process.env.DEFAULT_USER_ID;
    if (!userId) {
      return NextResponse.json(
        { error: "x-user-id header required" },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    const jobs = await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        sourceType: true,
        sourceUrl: true,
        sourceTitle: true,
        status: true,
        clipCount: true,
        textOutputCount: true,
        minutesConsumed: true,
        progress: true,
        error: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const total = await prisma.job.count({ where: { userId } });

    return NextResponse.json({
      jobs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[api] GET /api/v1/jobs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
