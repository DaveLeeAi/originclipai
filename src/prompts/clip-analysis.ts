// src/prompts/clip-analysis.ts

import { clipAnalysisResponseSchema, type ClipCandidate } from './schemas';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';
import type { PromptTemplate, SpeakerInfo } from './types';

interface ClipAnalysisParams {
  sourceTitle: string;
  duration: string;
  contentType: string;
  speakers: SpeakerInfo[];
  transcript: string;
  minDuration: number;
  maxDuration: number;
  targetClips: number;
}

export const clipAnalysisPrompt: PromptTemplate<ClipAnalysisParams, ClipCandidate[]> = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.3,
  maxTokens: 8000,

  system: `You are a content strategist analyzing a transcript to identify the best short-form video clip candidates for TikTok, YouTube Shorts, and LinkedIn.

A good clip candidate:
- Is standalone coherent — makes sense without any prior context
- Starts with a hook: a question, bold claim, surprising fact, or provocative statement
- Contains one clear, complete idea or insight
- Has emotional energy: passion, humor, controversy, vulnerability, or revelation
- Ends on a natural conclusion, not mid-thought
- Prioritize guest insights over host questions in interview content
- Avoid intros, outros, ad reads, and small talk

Score each clip on four factors (0-100):
- coherence: Does it make sense without context?
- hookStrength: How compelling are the opening 5 seconds?
- topicClarity: Is there one clear topic/takeaway?
- emotionalEnergy: Is the speaker passionate, funny, or provocative?

Overall score = coherence(30%) + hookStrength(25%) + topicClarity(25%) + emotionalEnergy(20%)

Return ONLY a JSON array. No markdown fences. No explanation. No preamble.`,

  buildUserMessage: (params) => {
    const speakerBlock = params.speakers.length > 0
      ? `SPEAKERS:\n${JSON.stringify(params.speakers, null, 2)}\n\n`
      : '';

    return `Analyze this transcript and identify the ${params.targetClips} best clip candidates.

SOURCE: ${params.sourceTitle}
DURATION: ${params.duration}
TYPE: ${params.contentType}

${speakerBlock}CONSTRAINTS:
- Minimum clip duration: ${params.minDuration} seconds
- Maximum clip duration: ${params.maxDuration} seconds
- Return exactly ${params.targetClips} candidates, ranked by score descending

TRANSCRIPT:
${params.transcript}

Return a JSON array. Each element must have these exact fields:
startTime (number, seconds), endTime (number, seconds), duration (number, seconds),
title (string), hook (string or null), transcriptExcerpt (string),
score (integer 0-100), scoreFactors ({coherence, hookStrength, topicClarity, emotionalEnergy} all integers 0-100),
primarySpeakerId (string), speakersPresent (array of {id, talkPct}),
topics (array of strings), socialCaption (string or null)`;
  },

  parseResponse: (raw) => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return clipAnalysisResponseSchema.parse(parsed);
  },
};
