import { z } from "zod";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";

export const textRefinementSchema = z.object({
  refinedText: z.string().min(10),
  wordCount: z.number().int(),
  changesMade: z.string().min(5),
});

export type TextRefinementOutput = z.infer<typeof textRefinementSchema>;

export interface TextRefinementParams {
  currentText: string;
  instruction: string;
}

export const textRefinementPrompt = {
  version: "1.0",
  model: "claude-sonnet-4-20250514",
  temperature: 0.5,
  maxTokens: 4000,

  system: `You refine text based on user instructions. Keep the core message and insights. Only change what the user asked for. Return ONLY JSON, no other text.`,

  buildUserMessage: (params: TextRefinementParams): string => {
    return `Refine this text based on the user's instruction.

CURRENT TEXT:
${params.currentText}

USER INSTRUCTION:
${params.instruction}

Return JSON:
{
  "refinedText": "...",
  "wordCount": 150,
  "changesMade": "Shortened from 250 to 150 words, strengthened opening hook"
}`;
  },

  parseResponse: (raw: string): TextRefinementOutput => {
    const cleaned = cleanLLMResponse(raw);
    const parsed: unknown = JSON.parse(cleaned);
    return textRefinementSchema.parse(parsed);
  },
};
