import { z } from "zod";
import type { Speaker } from "@/types";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";

const speakerRoleSchema = z.object({
  id: z.string(),
  role: z.enum(["host", "guest", "co-host", "solo", "unknown"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const speakerRolesResponseSchema = z.object({
  speakers: z.array(speakerRoleSchema).min(1),
});

export type SpeakerRoleOutput = z.infer<typeof speakerRoleSchema>;

export interface SpeakerRolesParams {
  speakers: Speaker[];
  transcriptFirst5Min: string;
}

export const speakerRolesPrompt = {
  version: "1.0",
  model: "claude-sonnet-4-20250514",
  temperature: 0.3,
  maxTokens: 1000,

  system: `You analyze transcripts to determine each speaker's role. Return ONLY JSON, no other text.`,

  buildUserMessage: (params: SpeakerRolesParams): string => {
    return `Analyze this transcript and determine each speaker's role in the conversation.

SPEAKERS:
${JSON.stringify(params.speakers, null, 2)}

TRANSCRIPT (first 5 minutes):
${params.transcriptFirst5Min}

Determine roles based on:
- Who asks questions vs. who answers
- Who introduces the other person
- Who says "welcome to the show" or similar
- Talk time ratios (hosts typically talk less in interviews)

Return JSON:
{
  "speakers": [
    {"id": "S1", "role": "host", "confidence": 0.95, "reasoning": "Introduces the guest, asks questions, lower talk time"},
    {"id": "S2", "role": "guest", "confidence": 0.90, "reasoning": "Introduced by host, gives extended answers, higher talk time"}
  ]
}

Valid roles: "host", "guest", "co-host", "solo", "unknown"
If this is a solo recording (one speaker), assign role "solo".`;
  },

  parseResponse: (raw: string): SpeakerRoleOutput[] => {
    const cleaned = cleanLLMResponse(raw);
    const parsed: unknown = JSON.parse(cleaned);
    return speakerRolesResponseSchema.parse(parsed).speakers;
  },
};
