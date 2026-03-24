// src/prompts/speaker-roles.ts

import { speakerRoleResultSchema, type SpeakerRoleResult } from './schemas';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';
import type { PromptTemplate, SpeakerInfo } from './types';

interface SpeakerRoleParams {
  speakers: SpeakerInfo[];
  transcriptFirst5Minutes: string;
  fullTranscriptLength: number;
}

export const speakerRolesPrompt: PromptTemplate<SpeakerRoleParams, SpeakerRoleResult> = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.2,
  maxTokens: 1000,

  system: `You are analyzing a conversation transcript to determine each speaker's role.

Role definitions:
- host: The person who runs the show. Asks questions, introduces guests, guides the conversation. Typically has lower talk-time percentage in interviews.
- guest: The person being interviewed. Gives extended answers, shares expertise. Typically has higher talk-time percentage.
- co_host: A second regular host. Asks questions alongside the primary host.
- solo: Only one speaker present. This is a monologue.
- unknown: Cannot determine role with confidence.

Signals to look for:
- Who says "welcome to the show/podcast/channel"? → host
- Who introduces the other person by name or credentials? → host
- Who asks most of the questions? → host
- Who gives the longest uninterrupted answers? → guest
- Talk-time ratio: in a 2-person interview, the guest usually talks 55-75% of the time.

Return ONLY a JSON object. No markdown fences. No explanation.`,

  buildUserMessage: (params) => {
    return `Determine the role of each speaker in this conversation.

SPEAKERS (with talk-time data):
${JSON.stringify(params.speakers, null, 2)}

FULL TRANSCRIPT LENGTH: ${params.fullTranscriptLength} characters

TRANSCRIPT (first 5 minutes — enough to identify roles):
${params.transcriptFirst5Minutes}

Return JSON:
{
  "speakers": [
    {"id": "speaker_id", "role": "host|guest|co_host|solo|unknown", "confidence": 0.0-1.0, "reasoning": "brief explanation"}
  ]
}`;
  },

  parseResponse: (raw) => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return speakerRoleResultSchema.parse(parsed);
  },
};
