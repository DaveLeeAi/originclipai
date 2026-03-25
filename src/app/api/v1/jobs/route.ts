import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { ingestQueue } from "@/lib/queue/queues";
import { createJobSchema } from "@/lib/utils/validation";
import { getUser } from "@/lib/auth/server";
import { generateContentHash } from "@/lib/cost/content-hash";
import { estimateJobCost } from "@/lib/cost/estimator";
import { checkJobGuardrails } from "@/lib/cost/guardrails";
import type { JobProgress } from "@/types";

/**
 * POST /api/v1/jobs — Create a new processing job.
 *
 * Validates input, checks cost guardrails, creates a job record, enqueues the ingest step.
 * Returns the job ID immediately — polling via GET /api/v1/jobs/:id for status.
 *
 * New cost-control fields:
 * - generationOptions: controls which outputs to generate (all default true)
 * - providerMode: "mock" | "gemini-dev" | "anthropic-prod"
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const input = createJobSchema.parse(body);

    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }
    const userId = user.id;

    // Resolve generation options with defaults
    const generationOptions = {
      clips: true,
      linkedin: true,
      xThread: true,
      newsletter: true,
      summary: true,
      insights: true,
      quotes: true,
      chapterMarkers: true,
      customTemplates: true,
      ...input.generationOptions,
    };

    const providerMode = input.providerMode ?? "anthropic-prod";

    // Check guardrails before creating job
    const guardrailResult = await checkJobGuardrails(userId, {
      sourceType: input.sourceType,
      generationOptions,
      providerMode,
    });

    if (!guardrailResult.allowed) {
      return NextResponse.json(
        {
          error: "Usage limit exceeded",
          blocked: guardrailResult.blocked,
        },
        { status: 429 },
      );
    }

    // Generate content hash for dedupe
    const contentHash = generateContentHash({
      sourceType: input.sourceType,
      sourceUrl: "sourceUrl" in input ? input.sourceUrl : null,
      sourceFileKey: "sourceFileKey" in input ? input.sourceFileKey : null,
    });

    // Estimate cost
    const estimate = estimateJobCost({
      sourceType: input.sourceType,
      generationOptions,
      providerMode,
    });

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
        generationOptions: JSON.parse(JSON.stringify(generationOptions)),
        providerMode,
        contentHash,
        estimatedCost: estimate.total,
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
        providerMode,
        estimatedCost: estimate.total,
        warnings: guardrailResult.warnings,
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
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }
    const userId = user.id;

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
