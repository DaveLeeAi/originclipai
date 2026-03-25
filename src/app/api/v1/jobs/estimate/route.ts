import { NextResponse } from "next/server";
import { costEstimateSchema } from "@/lib/utils/validation";
import { estimateJobCost } from "@/lib/cost/estimator";
import { getUserUsageStats } from "@/lib/cost/guardrails";
import { getUser } from "@/lib/auth/server";

/**
 * POST /api/v1/jobs/estimate — Get cost estimate before submitting a job.
 *
 * Returns estimated cost breakdown, LLM call count, and any warnings.
 * Does not create a job or consume any resources.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const input = costEstimateSchema.parse(body);

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const estimate = estimateJobCost({
      sourceType: input.sourceType,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      generationOptions: input.generationOptions,
      providerMode: input.providerMode,
    });

    const usage = await getUserUsageStats(user.id);

    return NextResponse.json({
      estimate,
      usage,
      providerMode: input.providerMode ?? "anthropic-prod",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input", details: error },
        { status: 400 },
      );
    }

    console.error("[api] POST /api/v1/jobs/estimate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
