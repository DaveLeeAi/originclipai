// src/lib/intelligence/clip-scorer.ts
//
// Computes composite engagement scores from 8 dimensions.
// Used both for LLM-produced scores and for post-processing adjustments.

import {
  expandedScoreFactorsSchema,
  SCORE_WEIGHTS,
  type ExpandedScoreFactors,
  type ScoredClipCandidate,
} from '@/prompts/schemas/intelligence';

export interface ScoreBreakdown {
  /** Composite score 0-100 */
  composite: number;
  /** Per-dimension weighted contributions */
  contributions: Record<keyof ExpandedScoreFactors, number>;
  /** Dimensions that dragged the score down (below 50) */
  weakDimensions: (keyof ExpandedScoreFactors)[];
  /** Dimensions that boosted the score (above 80) */
  strongDimensions: (keyof ExpandedScoreFactors)[];
  /** Human-readable label */
  tier: 'exceptional' | 'strong' | 'good' | 'decent' | 'weak';
}

/**
 * Compute a weighted composite score from 8 dimensions.
 */
export function computeCompositeScore(factors: ExpandedScoreFactors): number {
  let score = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    score += factors[key as keyof ExpandedScoreFactors] * weight;
  }
  return Math.round(score);
}

/**
 * Get a full score breakdown with contributions and analysis.
 */
export function getScoreBreakdown(factors: ExpandedScoreFactors): ScoreBreakdown {
  const contributions: Record<string, number> = {};
  const weakDimensions: (keyof ExpandedScoreFactors)[] = [];
  const strongDimensions: (keyof ExpandedScoreFactors)[] = [];

  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    const dimKey = key as keyof ExpandedScoreFactors;
    const value = factors[dimKey];
    contributions[key] = Math.round(value * weight);

    if (value < 50) weakDimensions.push(dimKey);
    if (value > 80) strongDimensions.push(dimKey);
  }

  const composite = computeCompositeScore(factors);

  return {
    composite,
    contributions: contributions as Record<keyof ExpandedScoreFactors, number>,
    weakDimensions,
    strongDimensions,
    tier: getTier(composite),
  };
}

/**
 * Rank an array of scored clips by composite score, descending.
 */
export function rankClips(clips: ScoredClipCandidate[]): ScoredClipCandidate[] {
  return [...clips].sort((a, b) => b.score - a.score);
}

/**
 * Apply duration-based adjustments to a clip's score factors.
 * Clips outside the sweet spot (30-90s) get penalized.
 */
export function adjustDurationFit(
  factors: ExpandedScoreFactors,
  durationSeconds: number,
): ExpandedScoreFactors {
  let durationFit = factors.durationFit;

  if (durationSeconds < 15) {
    durationFit = Math.min(durationFit, 20); // Too short
  } else if (durationSeconds < 30) {
    durationFit = Math.min(durationFit, 60); // Short but usable
  } else if (durationSeconds >= 30 && durationSeconds <= 90) {
    // Sweet spot — no penalty
  } else if (durationSeconds <= 120) {
    durationFit = Math.min(durationFit, 70); // Slightly long
  } else {
    durationFit = Math.min(durationFit, 40); // Too long for short-form
  }

  return { ...factors, durationFit };
}

/**
 * Apply speaker continuity adjustments.
 * Clips dominated by one speaker score higher on continuity.
 */
export function adjustSpeakerContinuity(
  factors: ExpandedScoreFactors,
  speakersPresent: { id: string; talkPct: number }[],
): ExpandedScoreFactors {
  if (speakersPresent.length <= 1) {
    // Solo speaker — max continuity
    return { ...factors, speakerContinuity: Math.max(factors.speakerContinuity, 90) };
  }

  const maxTalkPct = Math.max(...speakersPresent.map((s) => s.talkPct));

  if (maxTalkPct >= 80) {
    // One speaker dominates — good continuity
    return { ...factors, speakerContinuity: Math.max(factors.speakerContinuity, 80) };
  }
  if (maxTalkPct >= 60) {
    // Moderate dominance — OK continuity
    return factors;
  }

  // Split fairly evenly — potentially jarring for short-form
  return { ...factors, speakerContinuity: Math.min(factors.speakerContinuity, 55) };
}

/**
 * Convert legacy 4-dimension scores to the 8-dimension system.
 * Used for backward compatibility with existing clip analysis output.
 */
export function expandLegacyScoreFactors(legacy: {
  coherence: number;
  hookStrength: number;
  topicClarity: number;
  emotionalEnergy: number;
}): ExpandedScoreFactors {
  return {
    standaloneClarity: legacy.coherence,
    hookStrength: legacy.hookStrength,
    novelty: Math.round((legacy.topicClarity + legacy.emotionalEnergy) / 2),
    emotionalIntensity: legacy.emotionalEnergy,
    shareability: Math.round((legacy.hookStrength + legacy.emotionalEnergy) / 2),
    ctaPotential: Math.round(legacy.hookStrength * 0.7),
    speakerContinuity: 75, // Default — adjusted post-hoc
    durationFit: 75, // Default — adjusted post-hoc
  };
}

/**
 * Validate that score factors are within bounds.
 * Returns validated factors or throws.
 */
export function validateScoreFactors(factors: unknown): ExpandedScoreFactors {
  return expandedScoreFactorsSchema.parse(factors);
}

// ─── Internal Helpers ──────────────────────────────────────────────

function getTier(score: number): ScoreBreakdown['tier'] {
  if (score >= 90) return 'exceptional';
  if (score >= 75) return 'strong';
  if (score >= 60) return 'good';
  if (score >= 45) return 'decent';
  return 'weak';
}
