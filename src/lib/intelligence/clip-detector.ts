// src/lib/intelligence/clip-detector.ts
//
// Detects clip candidates from transcript content using LLM analysis.
// Wraps the clip-analysis prompt with the expanded 8-dimension scoring system.

import type { LLMProvider } from '@/lib/providers/llm';
import { clipAnalysisPrompt } from '@/prompts/clip-analysis';
import { hookTitlePrompt } from '@/prompts/hook-title';
import type { ClipCandidate } from '@/prompts/schemas';
import type { ScoredClipCandidate, HookTitleResponse } from '@/prompts/schemas/intelligence';
import type { Speaker } from '@/types';
import {
  computeCompositeScore,
  expandLegacyScoreFactors,
  adjustDurationFit,
  adjustSpeakerContinuity,
  rankClips,
} from './clip-scorer';
import { parseLLMResponseOrThrow } from './parse-guard';
import { clipAnalysisResponseSchema } from '@/prompts/schemas';
import { hookTitleResponseSchema } from '@/prompts/schemas/intelligence';
import { formatDuration } from '@/lib/utils/duration';

export interface ClipDetectionInput {
  sourceTitle: string;
  durationSeconds: number;
  contentType: string;
  speakers: Speaker[];
  transcript: string;
  /** Min clip duration in seconds. Default: 30 */
  minDuration?: number;
  /** Max clip duration in seconds. Default: 90 */
  maxDuration?: number;
  /** Target number of clips. Default: 15 */
  targetClips?: number;
  /** Whether to generate enhanced hooks/titles per clip. Default: false */
  generateHooks?: boolean;
}

export interface ClipDetectionResult {
  /** All detected clips, ranked by composite score */
  clips: ScoredClipCandidate[];
  /** Total clips detected before filtering */
  rawCount: number;
  /** Content type detected from speaker analysis */
  contentType: string;
}

/**
 * Detect clip candidates from a transcript using LLM analysis.
 * Returns clips with expanded 8-dimension scoring.
 */
export async function detectClips(
  llm: LLMProvider,
  input: ClipDetectionInput,
): Promise<ClipDetectionResult> {
  const minDuration = input.minDuration ?? 30;
  const maxDuration = input.maxDuration ?? 90;
  const targetClips = input.targetClips ?? 15;

  const speakerInfo = input.speakers.map((s) => ({
    id: s.id,
    label: s.label,
    role: s.role,
    talkTimePct: s.talkTimePct,
    talkTimeSeconds: s.talkTimeSeconds,
  }));

  // Step 1: Get raw clip candidates from the LLM
  const messages = [
    { role: 'system' as const, content: clipAnalysisPrompt.system },
    {
      role: 'user' as const,
      content: clipAnalysisPrompt.buildUserMessage({
        sourceTitle: input.sourceTitle,
        duration: formatDuration(input.durationSeconds),
        contentType: input.contentType,
        speakers: speakerInfo,
        transcript: input.transcript,
        minDuration,
        maxDuration,
        targetClips,
      }),
    },
  ];

  const response = await llm.chat(messages, {
    model: clipAnalysisPrompt.model,
    temperature: clipAnalysisPrompt.temperature,
    maxTokens: clipAnalysisPrompt.maxTokens,
  });

  let rawClips: ClipCandidate[];
  try {
    rawClips = parseLLMResponseOrThrow(response.content, clipAnalysisResponseSchema, 'clip detection');
  } catch {
    // Retry with format reinforcement
    const retryMessages = [
      ...messages,
      { role: 'assistant' as const, content: response.content },
      {
        role: 'user' as const,
        content: 'Your response was not valid JSON. Return ONLY a JSON array of clip candidates, no other text.',
      },
    ];
    const retryResponse = await llm.chat(retryMessages, {
      model: clipAnalysisPrompt.model,
      temperature: 0.1,
      maxTokens: clipAnalysisPrompt.maxTokens,
    });
    rawClips = parseLLMResponseOrThrow(retryResponse.content, clipAnalysisResponseSchema, 'clip detection retry');
  }

  // Step 2: Expand to 8-dimension scores and apply adjustments
  const scoredClips: ScoredClipCandidate[] = rawClips.map((clip) => {
    let expanded = expandLegacyScoreFactors(clip.scoreFactors);
    expanded = adjustDurationFit(expanded, clip.duration);
    expanded = adjustSpeakerContinuity(expanded, clip.speakersPresent);
    const compositeScore = computeCompositeScore(expanded);

    return {
      startTime: clip.startTime,
      endTime: clip.endTime,
      duration: clip.duration,
      title: clip.title,
      hook: clip.hook,
      transcriptExcerpt: clip.transcriptExcerpt,
      score: compositeScore,
      scoreFactors: expanded,
      primarySpeakerId: clip.primarySpeakerId,
      speakersPresent: clip.speakersPresent,
      topics: clip.topics,
      socialCaption: clip.socialCaption,
      selectionReason: null,
    };
  });

  // Step 3: Rank by composite score
  const ranked = rankClips(scoredClips);

  // Step 4: Optionally generate enhanced hooks/titles for top clips
  if (input.generateHooks) {
    const topClips = ranked.slice(0, 5);
    await enhanceWithHooks(llm, topClips, input.speakers);
  }

  return {
    clips: ranked,
    rawCount: rawClips.length,
    contentType: input.contentType,
  };
}

/**
 * Generate enhanced hooks and titles for specific clips.
 */
export async function generateHooksForClip(
  llm: LLMProvider,
  clipTranscript: string,
  topicSummary: string,
  speakerRole: string,
  count: number = 3,
): Promise<HookTitleResponse> {
  const messages = [
    { role: 'system' as const, content: hookTitlePrompt.system },
    {
      role: 'user' as const,
      content: hookTitlePrompt.buildUserMessage({
        clipTranscript,
        topicSummary,
        speakerRole,
        count,
      }),
    },
  ];

  const response = await llm.chat(messages, {
    model: hookTitlePrompt.model,
    temperature: hookTitlePrompt.temperature,
    maxTokens: hookTitlePrompt.maxTokens,
  });

  return parseLLMResponseOrThrow(response.content, hookTitleResponseSchema, 'hook/title generation');
}

// ─── Internal ──────────────────────────────────────────────────────

async function enhanceWithHooks(
  llm: LLMProvider,
  clips: ScoredClipCandidate[],
  speakers: Speaker[],
): Promise<void> {
  const results = await Promise.allSettled(
    clips.map(async (clip) => {
      const speaker = speakers.find((s) => s.id === clip.primarySpeakerId);
      const hookResult = await generateHooksForClip(
        llm,
        clip.transcriptExcerpt,
        clip.topics.join(', '),
        speaker?.role ?? 'unknown',
        2,
      );

      // Pick the highest-scoring hook
      const best = hookResult.options.sort((a, b) => b.scrollStopScore - a.scrollStopScore)[0];
      if (best) {
        clip.title = best.title;
        clip.hook = best.hook;
      }
    }),
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn('[clip-detector] Hook enhancement failed for a clip:', result.reason);
    }
  }
}
