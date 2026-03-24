// src/prompts/schemas/intelligence.ts
//
// Zod schemas for the intelligence layer: expanded clip scoring,
// key insight extraction, notable quote extraction, and hook/title generation.

import { z } from 'zod';

// ============================================================
// EXPANDED CLIP SCORING — 8 DIMENSIONS
// ============================================================

export const expandedScoreFactorsSchema = z.object({
  /** Does the clip make sense without any prior context? (0-100) */
  standaloneClarity: z.number().int().min(0).max(100),
  /** How compelling are the opening 3-5 seconds? (0-100) */
  hookStrength: z.number().int().min(0).max(100),
  /** Does the clip present a fresh, non-obvious idea? (0-100) */
  novelty: z.number().int().min(0).max(100),
  /** Is the speaker passionate, funny, vulnerable, or provocative? (0-100) */
  emotionalIntensity: z.number().int().min(0).max(100),
  /** Would someone want to share this with others? (0-100) */
  shareability: z.number().int().min(0).max(100),
  /** Does the clip naturally end in a way that invites action? (0-100) */
  ctaPotential: z.number().int().min(0).max(100),
  /** Does one speaker carry the clip without awkward handoffs? (0-100) */
  speakerContinuity: z.number().int().min(0).max(100),
  /** Is the clip in the 30-90s sweet spot for short-form? (0-100) */
  durationFit: z.number().int().min(0).max(100),
});

export type ExpandedScoreFactors = z.infer<typeof expandedScoreFactorsSchema>;

/**
 * Weights for computing a composite score from 8 dimensions.
 * Sum to 1.0. Tuned for short-form video engagement.
 */
export const SCORE_WEIGHTS: Record<keyof ExpandedScoreFactors, number> = {
  standaloneClarity: 0.18,
  hookStrength: 0.20,
  novelty: 0.12,
  emotionalIntensity: 0.13,
  shareability: 0.12,
  ctaPotential: 0.08,
  speakerContinuity: 0.07,
  durationFit: 0.10,
};

export const scoredClipCandidateSchema = z.object({
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  duration: z.number().min(10).max(180),
  title: z.string().min(3).max(200),
  hook: z.string().max(300).optional().nullable(),
  transcriptExcerpt: z.string().min(10),
  score: z.number().int().min(0).max(100),
  scoreFactors: expandedScoreFactorsSchema,
  primarySpeakerId: z.string(),
  speakersPresent: z.array(
    z.object({
      id: z.string(),
      talkPct: z.number().min(0).max(100),
    })
  ),
  topics: z.array(z.string()).max(5),
  socialCaption: z.string().max(500).optional().nullable(),
  /** Why this clip was selected — human-readable reason for review UI */
  selectionReason: z.string().max(300).optional().nullable(),
});

export const scoredClipResponseSchema = z.array(scoredClipCandidateSchema).min(1).max(30);

export type ScoredClipCandidate = z.infer<typeof scoredClipCandidateSchema>;

// ============================================================
// KEY INSIGHT EXTRACTION
// ============================================================

export const keyInsightSchema = z.object({
  /** The insight expressed as a standalone statement */
  insight: z.string().min(10).max(500),
  /** Why this is valuable or non-obvious */
  significance: z.string().min(10).max(300),
  /** Which speaker delivered this insight */
  speakerId: z.string().optional().nullable(),
  /** Approximate timestamp in the transcript (seconds) */
  approximateTimestamp: z.number().min(0).optional().nullable(),
  /** Tags for categorization */
  tags: z.array(z.string()).max(5),
  /** Confidence that this is a genuine insight vs. generic statement */
  confidence: z.number().min(0).max(1),
});

export const keyInsightsResponseSchema = z.object({
  insights: z.array(keyInsightSchema).min(1).max(20),
  topicSummary: z.string().min(10).max(500),
});

export type KeyInsight = z.infer<typeof keyInsightSchema>;
export type KeyInsightsResponse = z.infer<typeof keyInsightsResponseSchema>;

// ============================================================
// NOTABLE QUOTE EXTRACTION
// ============================================================

export const notableQuoteSchema = z.object({
  /** The exact (or near-exact) quote from the transcript */
  quote: z.string().min(10).max(500),
  /** Who said it */
  speakerId: z.string(),
  /** Speaker's name/label if available */
  speakerLabel: z.string().optional().nullable(),
  /** Approximate timestamp in seconds */
  approximateTimestamp: z.number().min(0).optional().nullable(),
  /** The broader context or setup for the quote */
  context: z.string().min(5).max(300),
  /** Why this quote stands out */
  impact: z.enum([
    'provocative',
    'insightful',
    'humorous',
    'vulnerable',
    'contrarian',
    'motivational',
    'practical',
  ]),
  /** Could this quote work as a standalone social media post? */
  socialReady: z.boolean(),
});

export const notableQuotesResponseSchema = z.object({
  quotes: z.array(notableQuoteSchema).min(1).max(15),
});

export type NotableQuote = z.infer<typeof notableQuoteSchema>;
export type NotableQuotesResponse = z.infer<typeof notableQuotesResponseSchema>;

// ============================================================
// HOOK / TITLE GENERATION
// ============================================================

export const hookTitlePairSchema = z.object({
  /** Short-form video title (for YouTube Shorts, TikTok) */
  title: z.string().min(5).max(100),
  /** Opening hook line — what the viewer hears/reads first */
  hook: z.string().min(5).max(200),
  /** The hook's rhetorical strategy */
  hookType: z.enum([
    'question',
    'bold_claim',
    'surprising_fact',
    'story_opener',
    'contrarian',
    'teaser',
    'confession',
  ]),
  /** How well this hook stops the scroll (0-100) */
  scrollStopScore: z.number().int().min(0).max(100),
});

export const hookTitleResponseSchema = z.object({
  options: z.array(hookTitlePairSchema).min(1).max(5),
});

export type HookTitlePair = z.infer<typeof hookTitlePairSchema>;
export type HookTitleResponse = z.infer<typeof hookTitleResponseSchema>;
