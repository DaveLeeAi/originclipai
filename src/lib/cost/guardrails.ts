// src/lib/cost/guardrails.ts
//
// Usage guardrails to prevent runaway API costs.
// Enforced at job creation time and before expensive operations.

import { prisma } from "@/lib/db/client";
import { estimateJobCost } from "./estimator";
import type { GenerationOptions, ProviderMode, UsageStats } from "@/types";

// ─── Configurable Limits ────────────────────────────────────────────
// Override via env vars. Defaults are conservative for solo dev.

/** Max LLM calls per user per day */
function getDailyLLMCallLimit(): number {
  return parseInt(process.env.DAILY_LLM_CALL_LIMIT ?? "200", 10);
}

/** Max estimated daily spend in USD */
function getDailyCostLimit(): number {
  return parseFloat(process.env.DAILY_COST_LIMIT_USD ?? "10.00");
}

/** Max jobs per user per day */
function getDailyJobLimit(): number {
  return parseInt(process.env.DAILY_JOB_LIMIT ?? "50", 10);
}

/** Per-job cost warning threshold in USD */
function getJobCostWarningThreshold(): number {
  return parseFloat(process.env.JOB_COST_WARNING_USD ?? "0.50");
}

// ─── Usage Tracking ─────────────────────────────────────────────────

/**
 * Get current daily usage stats for a user.
 */
export async function getUserUsageStats(userId: string): Promise<UsageStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaysJobs = await prisma.job.findMany({
    where: {
      userId,
      createdAt: { gte: todayStart },
    },
    select: {
      actualLlmCalls: true,
      estimatedCost: true,
    },
  });

  const llmCallsToday = todaysJobs.reduce((sum, j) => sum + j.actualLlmCalls, 0);
  const estimatedCostToday = todaysJobs.reduce((sum, j) => sum + (j.estimatedCost ?? 0), 0);

  return {
    llmCallsToday,
    llmCallsLimit: getDailyLLMCallLimit(),
    estimatedCostToday: Math.round(estimatedCostToday * 10000) / 10000,
    costLimitDaily: getDailyCostLimit(),
    jobsToday: todaysJobs.length,
  };
}

// ─── Guardrail Checks ───────────────────────────────────────────────

export interface GuardrailResult {
  allowed: boolean;
  warnings: string[];
  blocked?: string;
}

/**
 * Check all guardrails before allowing a job to be created.
 * Returns allowed=false with a reason if any hard limit is exceeded.
 * Returns warnings for soft limits (approaching caps).
 */
export async function checkJobGuardrails(
  userId: string,
  input: {
    sourceType: string;
    estimatedDurationMinutes?: number;
    generationOptions?: Partial<GenerationOptions>;
    providerMode?: ProviderMode;
  },
): Promise<GuardrailResult> {
  const warnings: string[] = [];
  const stats = await getUserUsageStats(userId);
  const estimate = estimateJobCost(input);

  // Hard limit: daily job count
  const jobLimit = getDailyJobLimit();
  if (stats.jobsToday >= jobLimit) {
    return {
      allowed: false,
      warnings: [],
      blocked: `Daily job limit reached (${jobLimit} jobs/day). Try again tomorrow or increase DAILY_JOB_LIMIT.`,
    };
  }

  // Hard limit: daily LLM calls
  const expectedCalls = estimate.analysis.calls + estimate.textGeneration.calls;
  if (stats.llmCallsToday + expectedCalls > stats.llmCallsLimit) {
    return {
      allowed: false,
      warnings: [],
      blocked: `Daily LLM call limit would be exceeded (${stats.llmCallsToday}/${stats.llmCallsLimit} used, this job needs ~${expectedCalls} calls). Reduce outputs or switch to mock mode.`,
    };
  }

  // Hard limit: daily cost
  if (stats.estimatedCostToday + estimate.total > stats.costLimitDaily) {
    return {
      allowed: false,
      warnings: [],
      blocked: `Daily cost limit would be exceeded ($${stats.estimatedCostToday.toFixed(2)}/$${stats.costLimitDaily.toFixed(2)} used, this job estimated at $${estimate.total.toFixed(2)}). Switch to gemini-dev or mock mode.`,
    };
  }

  // Soft warning: approaching limits
  if (stats.llmCallsToday + expectedCalls > stats.llmCallsLimit * 0.8) {
    warnings.push(
      `Approaching daily LLM call limit (${stats.llmCallsToday + expectedCalls}/${stats.llmCallsLimit})`,
    );
  }
  if (stats.estimatedCostToday + estimate.total > stats.costLimitDaily * 0.8) {
    warnings.push(
      `Approaching daily cost limit ($${(stats.estimatedCostToday + estimate.total).toFixed(2)}/$${stats.costLimitDaily.toFixed(2)})`,
    );
  }

  // Soft warning: expensive job
  const costThreshold = getJobCostWarningThreshold();
  if (estimate.total > costThreshold) {
    warnings.push(
      `This job is estimated at $${estimate.total.toFixed(2)} — consider disabling unused outputs or using gemini-dev mode`,
    );
  }

  // Add any warnings from the cost estimator
  warnings.push(...estimate.warnings);

  return { allowed: true, warnings };
}

/**
 * Increment the LLM call counter for a job.
 * Called by workers after each LLM call.
 */
export async function incrementLLMCallCount(jobId: string, count = 1): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: { actualLlmCalls: { increment: count } },
  });
}
