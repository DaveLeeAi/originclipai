import { z } from "zod";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";

export const chapterMarkersSchema = z.object({
  chapters: z
    .array(
      z.object({
        timestamp: z.string().regex(/^\d+:\d{2}$/),
        title: z.string().min(3).max(100),
      }),
    )
    .min(3)
    .max(20),
});

export type ChapterMarkersOutput = z.infer<typeof chapterMarkersSchema>;

export interface ChapterMarkersParams {
  sourceTitle: string;
  duration: string;
  transcript: string;
}

export const chapterMarkersPrompt = {
  version: "1.0",
  model: "claude-sonnet-4-20250514",
  temperature: 0.3,
  maxTokens: 2000,

  system: `You generate YouTube-formatted chapter markers from transcripts. Return ONLY JSON, no other text.`,

  buildUserMessage: (params: ChapterMarkersParams): string => {
    return `Generate YouTube-formatted chapter markers for this content.

SOURCE: ${params.sourceTitle}
DURATION: ${params.duration}
CONTENT:
${params.transcript}

Return JSON:
{
  "chapters": [
    {"timestamp": "0:00", "title": "Introduction"},
    {"timestamp": "2:15", "title": "Why content systems matter"},
    {"timestamp": "8:42", "title": "The 3-part framework"}
  ]
}

Rules:
- First chapter must be at 0:00
- Minimum 3 chapters, maximum 15
- Each title is 3-8 words
- Chapters should be at least 2 minutes apart`;
  },

  parseResponse: (raw: string): ChapterMarkersOutput => {
    const cleaned = cleanLLMResponse(raw);
    const parsed: unknown = JSON.parse(cleaned);
    return chapterMarkersSchema.parse(parsed);
  },
};
