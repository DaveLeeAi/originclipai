import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getUser } from "@/lib/auth/server";
import { stageRerunSchema } from "@/lib/utils/validation";
import { transcribeQueue, analyzeQueue, renderQueue } from "@/lib/queue/queues";
import { updateJobProgress, updateJobStatus } from "@/lib/db/job-progress";
import { checkJobGuardrails } from "@/lib/cost/guardrails";
import type { GenerationOptions, ProviderMode } from "@/types";

/**
 * POST /api/v1/jobs/:id/rerun — Rerun a specific pipeline stage.
 *
 * Allows re-running transcribe, analyze, or render independently without
 * restarting the entire pipeline. Useful for:
 * - Re-analyzing with different generation options (e.g., add LinkedIn posts)
 * - Re-analyzing with a different provider mode (e.g., switch to anthropic-prod)
 * - Re-transcribing with a different engine
 * - Re-rendering clips after caption style changes
 *
 * Body: { stage: "transcribe" | "analyze" | "render", generationOptions?, providerMode? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body: unknown = await request.json();
    const input = stageRerunSchema.parse(body);

    const job = await prisma.job.findFirst({
      where: { id, userId: user.id },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Only allow rerun on completed or failed jobs
    if (!["complete", "failed"].includes(job.status)) {
      return NextResponse.json(
        { error: `Cannot rerun stage on a job with status '${job.status}'. Job must be complete or failed.` },
        { status: 400 },
      );
    }

    const rerunGenOpts = input.generationOptions
      ? { ...(job.generationOptions as Partial<GenerationOptions>), ...input.generationOptions }
      : undefined;
    const rerunMode = input.providerMode ?? (job.providerMode as ProviderMode);

    // Check guardrails for analyze/transcribe reruns (they consume LLM/API calls)
    if (input.stage !== "render") {
      const guardrail = await checkJobGuardrails(user.id, {
        sourceType: job.sourceType,
        generationOptions: rerunGenOpts,
        providerMode: rerunMode,
      });

      if (!guardrail.allowed) {
        return NextResponse.json(
          { error: "Usage limit exceeded", blocked: guardrail.blocked },
          { status: 429 },
        );
      }
    }

    switch (input.stage) {
      case "transcribe": {
        // Delete existing transcript so it gets re-created
        await prisma.transcript.deleteMany({ where: { jobId: id } });

        await updateJobStatus(id, "transcribing");
        await updateJobProgress(id, "transcribe", "pending");

        await transcribeQueue().add(
          "transcribe",
          {
            jobId: id,
            sourceFileKey: job.sourceFileKey!,
            engine: "whisper",
          },
          { jobId: `transcribe-${id}-rerun-${Date.now()}` },
        );

        return NextResponse.json({
          status: "rerunning",
          stage: "transcribe",
          jobId: id,
        });
      }

      case "analyze": {
        // Delete existing clips and text outputs so they get re-created
        await prisma.clip.deleteMany({ where: { jobId: id } });
        await prisma.textOutput.deleteMany({ where: { jobId: id } });

        // Update generation options and provider mode if changed
        const updateData: Record<string, unknown> = {
          clipCount: 0,
          textOutputCount: 0,
          actualLlmCalls: 0,
        };
        if (rerunGenOpts) {
          updateData.generationOptions = JSON.parse(JSON.stringify(rerunGenOpts));
        }
        if (input.providerMode) {
          updateData.providerMode = input.providerMode;
        }
        await prisma.job.update({ where: { id }, data: updateData });

        await updateJobStatus(id, "analyzing");
        await updateJobProgress(id, "analyze", "pending");

        const transcript = await prisma.transcript.findUnique({
          where: { jobId: id },
          select: { id: true },
        });

        if (!transcript) {
          return NextResponse.json(
            { error: "No transcript found — run transcribe stage first" },
            { status: 400 },
          );
        }

        await analyzeQueue().add(
          "analyze",
          {
            jobId: id,
            transcriptId: transcript.id,
            sourceType: job.sourceType as import("@/types").SourceType,
            generationOptions: rerunGenOpts as GenerationOptions,
            providerMode: rerunMode,
          },
          { jobId: `analyze-${id}-rerun-${Date.now()}` },
        );

        return NextResponse.json({
          status: "rerunning",
          stage: "analyze",
          jobId: id,
          generationOptions: rerunGenOpts,
          providerMode: rerunMode,
        });
      }

      case "render": {
        const clips = await prisma.clip.findMany({
          where: { jobId: id },
          select: { id: true, startTime: true, endTime: true, captionStyle: true },
        });

        if (clips.length === 0) {
          return NextResponse.json(
            { error: "No clips found — run analyze stage first" },
            { status: 400 },
          );
        }

        // Reset render status on all clips
        await prisma.clip.updateMany({
          where: { jobId: id },
          data: { renderStatus: "pending", renderedFiles: "{}" },
        });

        await updateJobStatus(id, "rendering");
        await updateJobProgress(id, "render", "running", {
          clips_rendered: 0,
          clips_total: clips.length,
        });

        // Note: render queue enqueue would go here when render worker is enabled
        // For now, just update status since render is currently skipped
        await updateJobProgress(id, "render", "skipped");
        await updateJobStatus(id, "complete");

        return NextResponse.json({
          status: "rerunning",
          stage: "render",
          jobId: id,
          clipCount: clips.length,
          note: "Render worker is currently disabled — clips marked for re-render when enabled",
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown stage: ${input.stage}` },
          { status: 400 },
        );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 },
      );
    }

    console.error("[api] POST /api/v1/jobs/:id/rerun error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
