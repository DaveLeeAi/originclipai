// src/lib/cost/estimator.ts
//
// Pre-submission cost estimation for jobs.
// Gives users a cost breakdown before they commit to processing.

import type {
  GenerationOptions,
  ProviderMode,
  CostEstimate,
} from "@/types";

// ─── Cost Constants (per-call estimates in USD) ─────────────────────
// Based on typical token usage per LLM call in our pipeline.
// Updated as we gather real usage data.

interface ProviderCosts {
  /** Average cost per clip-detection call (large prompt) */
  clipDetection: number;
  /** Average cost per text-generation call (medium prompt) */
  textGeneration: number;
  /** Average cost per speaker-role call (small prompt) */
  speakerRoles: number;
  /** Average cost per insight/quote extraction call */
  insightExtraction: number;
  /** Average cost per summary call */
  summary: number;
}

const COST_PER_CALL: Record<ProviderMode, ProviderCosts> = {
  mock: {
    clipDetection: 0,
    textGeneration: 0,
    speakerRoles: 0,
    insightExtraction: 0,
    summary: 0,
  },
  "gemini-dev": {
    // Gemini Flash: ~$0.075/M input, ~$0.30/M output
    clipDetection: 0.003,
    textGeneration: 0.001,
    speakerRoles: 0.0005,
    insightExtraction: 0.002,
    summary: 0.001,
  },
  "anthropic-prod": {
    // Claude Sonnet: ~$3/M input, ~$15/M output
    clipDetection: 0.12,
    textGeneration: 0.04,
    speakerRoles: 0.02,
    insightExtraction: 0.08,
    summary: 0.04,
  },
};

/** Transcription costs (per minute of audio) */
const TRANSCRIPTION_COST_PER_MINUTE: Record<string, number> = {
  whisper: 0.006, // Modal.com Whisper
  assemblyai: 0.01, // AssemblyAI
  mock: 0,
};

interface EstimateInput {
  sourceType: string;
  estimatedDurationMinutes?: number;
  generationOptions?: Partial<GenerationOptions>;
  providerMode?: ProviderMode;
}

/**
 * Estimate the cost of a job before submission.
 * Returns a breakdown by pipeline stage and total estimated cost.
 */
export function estimateJobCost(input: EstimateInput): CostEstimate {
  const mode = input.providerMode ?? "anthropic-prod";
  const costs = COST_PER_CALL[mode];
  const duration = input.estimatedDurationMinutes ?? 30; // default assumption

  const opts: GenerationOptions = {
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

  const isTextOnly = input.sourceType === "article_url" || input.sourceType === "pdf_upload";
  const warnings: string[] = [];

  // Transcription estimate
  let transcriptionCalls = 0;
  let transcriptionCost = 0;
  if (!isTextOnly) {
    transcriptionCalls = 1;
    const engine = mode === "mock" ? "mock" : "whisper";
    transcriptionCost = duration * (TRANSCRIPTION_COST_PER_MINUTE[engine] ?? 0.006);
  }

  // Analysis estimate (LLM calls)
  let analysisCalls = 0;
  let analysisCost = 0;

  // Speaker roles (1 call if video/audio with multiple speakers)
  if (!isTextOnly) {
    analysisCalls += 1;
    analysisCost += costs.speakerRoles;
  }

  // Clip detection (1 call, largest cost)
  if (opts.clips && !isTextOnly) {
    analysisCalls += 1;
    analysisCost += costs.clipDetection;

    // Longer content may need chunked clip detection
    if (duration > 60) {
      const extraChunks = Math.ceil(duration / 60) - 1;
      analysisCalls += extraChunks;
      analysisCost += extraChunks * costs.clipDetection;
      if (duration > 120) {
        warnings.push(`Long content (${duration}min) will require multiple clip-detection passes`);
      }
    }
  }

  // Insights + quotes (1 call for both)
  if (opts.insights || opts.quotes) {
    analysisCalls += 1;
    analysisCost += costs.insightExtraction;
  }

  // Summary (1 call)
  if (opts.summary) {
    analysisCalls += 1;
    analysisCost += costs.summary;
  }

  // Text generation estimate
  let textGenCalls = 0;
  let textGenCost = 0;

  if (opts.linkedin) {
    textGenCalls += 1;
    textGenCost += costs.textGeneration;
  }
  if (opts.xThread) {
    textGenCalls += 1;
    textGenCost += costs.textGeneration;
  }
  if (opts.newsletter) {
    textGenCalls += 1;
    textGenCost += costs.textGeneration;
  }
  if (opts.chapterMarkers && !isTextOnly) {
    textGenCalls += 1;
    textGenCost += costs.textGeneration;
  }

  const total = transcriptionCost + analysisCost + textGenCost;

  // Warnings
  if (mode === "anthropic-prod" && total > 0.50) {
    warnings.push(`Estimated cost $${total.toFixed(2)} — consider gemini-dev mode for iteration`);
  }
  if (mode === "anthropic-prod" && allOutputsEnabled(opts) && !isTextOnly) {
    warnings.push("All outputs enabled — disable unused outputs to reduce cost");
  }

  return {
    transcription: { calls: transcriptionCalls, estimatedCost: round(transcriptionCost) },
    analysis: { calls: analysisCalls, estimatedCost: round(analysisCost) },
    textGeneration: { calls: textGenCalls, estimatedCost: round(textGenCost) },
    total: round(total),
    currency: "USD",
    warnings,
  };
}

function allOutputsEnabled(opts: GenerationOptions): boolean {
  return opts.clips && opts.linkedin && opts.xThread && opts.newsletter &&
    opts.summary && opts.insights && opts.quotes && opts.chapterMarkers;
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Count the expected number of LLM calls for a given configuration.
 * Useful for guardrail enforcement without computing full cost.
 */
export function countExpectedLLMCalls(input: EstimateInput): number {
  const estimate = estimateJobCost(input);
  return estimate.analysis.calls + estimate.textGeneration.calls;
}
