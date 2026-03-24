// src/prompts/chapter-markers.ts

import { chapterMarkersSchema, type ChapterMarkers } from './schemas';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';
import type { PromptTemplate, SpeakerInfo } from './types';

interface ChapterMarkersParams {
  sourceTitle: string;
  durationSeconds: number;
  durationFormatted: string;
  transcript: string;
  speakers?: SpeakerInfo[];
}

export const chapterMarkersPrompt: PromptTemplate<ChapterMarkersParams, ChapterMarkers> = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.2,
  maxTokens: 2000,

  system: `You are generating YouTube-formatted chapter markers for a video.

Rules:
- First chapter MUST be at 0:00.
- Minimum 3 chapters, maximum 15.
- Each title is 3-8 words. Descriptive, not clickbait.
- Chapters should be at least 2 minutes apart.
- Identify genuine topic transitions, not arbitrary time splits.
- Use the transcript timestamps to place chapters accurately.
- Format: "M:SS" for under 1 hour, "H:MM:SS" for over 1 hour.

Return ONLY a JSON object. No markdown fences. No explanation.`,

  buildUserMessage: (params) => {
    return `Generate chapter markers for this video.

SOURCE: ${params.sourceTitle}
DURATION: ${params.durationFormatted} (${Math.round(params.durationSeconds)} seconds)

TRANSCRIPT (with timestamps):
${params.transcript}

Return a JSON object with:
chapters (array of {timestamp: string in "M:SS" or "H:MM:SS" format, title: string 3-8 words})

First chapter must be at "0:00".`;
  },

  parseResponse: (raw) => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return chapterMarkersSchema.parse(parsed);
  },
};
