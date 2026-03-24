import { z } from "zod";
import type { Speaker } from "@/types";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";

export const clipCandidateSchema = z.object({
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  duration: z.number().min(10).max(180),
  title: z.string().min(3).max(200),
  hook: z.string().optional().default(""),
  transcriptExcerpt: z.string().min(10),
  score: z.number().int().min(0).max(100),
  scoreFactors: z.object({
    coherence: z.number().int().min(0).max(100),
    hookStrength: z.number().int().min(0).max(100),
    topicClarity: z.number().int().min(0).max(100),
    emotionalEnergy: z.number().int().min(0).max(100),
  }),
  primarySpeakerId: z.string(),
  speakersPresent: z.array(
    z.object({
      id: z.string(),
      talkPct: z.number().min(0).max(100),
    }),
  ),
  topics: z.array(z.string()).optional().default([]),
  socialCaption: z.string().optional().default(""),
});

export const clipAnalysisResponseSchema = z.array(clipCandidateSchema).min(1).max(30);

export type ClipCandidateOutput = z.infer<typeof clipCandidateSchema>;

export interface ClipAnalysisParams {
  sourceTitle: string;
  duration: string;
  contentType: string;
  speakers: Speaker[];
  transcript: string;
  minDuration: number;
  maxDuration: number;
  targetClips: number;
}

export const clipAnalysisPrompt = {
  version: "1.0",
  model: "claude-sonnet-4-20250514",
  temperature: 0.3,
  maxTokens: 8000,

  system: `You are a content strategist analyzing a transcript to identify the best short-form video clip candidates. You understand what makes content engaging on TikTok, YouTube Shorts, and Instagram Reels.

A good clip candidate:
- Is 30-90 seconds long (configurable)
- Starts with a hook (question, bold statement, surprising fact)
- Contains a single complete idea or insight
- Makes sense without any additional context (standalone coherent)
- Has emotional energy (passion, humor, controversy, revelation)
- Ends on a natural conclusion, not mid-sentence

Weight guest insights higher than host questions when scoring.

You must return ONLY a JSON array. No other text, no markdown fences, no explanation.`,

  buildUserMessage: (params: ClipAnalysisParams): string => {
    return `Analyze this transcript and identify the ${params.targetClips} best clip candidates for short-form video.

SOURCE METADATA:
- Title: ${params.sourceTitle}
- Duration: ${params.duration}
- Content type: ${params.contentType}

SPEAKERS:
${JSON.stringify(params.speakers, null, 2)}

CONSTRAINTS:
- Minimum clip duration: ${params.minDuration} seconds
- Maximum clip duration: ${params.maxDuration} seconds
- Target clip count: ${params.targetClips}

TRANSCRIPT:
${params.transcript}

Return a JSON array of clip candidates with this exact structure:
[
  {
    "startTime": 125.4,
    "endTime": 172.8,
    "duration": 47.4,
    "title": "Why most people fail at content consistency",
    "hook": "Here's the thing nobody tells you about posting every day...",
    "transcriptExcerpt": "Here's the thing nobody tells you...",
    "score": 94,
    "scoreFactors": {
      "coherence": 95,
      "hookStrength": 92,
      "topicClarity": 96,
      "emotionalEnergy": 88
    },
    "primarySpeakerId": "S1",
    "speakersPresent": [{"id": "S1", "talkPct": 100}],
    "topics": ["content strategy", "consistency"],
    "socialCaption": "Stop trying to be disciplined. Build a system instead."
  }
]

Score each factor 0-100:
- coherence: Does the clip make sense without context?
- hookStrength: How compelling is the opening 5 seconds?
- topicClarity: Is there one clear topic/insight?
- emotionalEnergy: Is the speaker passionate, funny, or provocative?

Overall score = weighted average: coherence(30%) + hookStrength(25%) + topicClarity(25%) + emotionalEnergy(20%)`;
  },

  parseResponse: (raw: string): ClipCandidateOutput[] => {
    const cleaned = cleanLLMResponse(raw);
    const parsed: unknown = JSON.parse(cleaned);
    return clipAnalysisResponseSchema.parse(parsed);
  },
};
