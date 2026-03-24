import { z } from "zod";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";

export const summarySchema = z.object({
  summary: z.string().min(50).max(2000),
  keyInsights: z.array(z.string()).min(2).max(10),
  wordCount: z.number().int(),
});

export type SummaryOutput = z.infer<typeof summarySchema>;

export interface SummaryParams {
  sourceTitle: string;
  content: string;
}

export const summaryPrompt = {
  version: "1.0",
  model: "claude-sonnet-4-20250514",
  temperature: 0.3,
  maxTokens: 2000,

  system: `You generate concise, insightful summaries of content. Return ONLY JSON, no other text.`,

  buildUserMessage: (params: SummaryParams): string => {
    return `Generate a 2-3 paragraph summary of this content.

SOURCE: ${params.sourceTitle}
CONTENT:
${params.content}

Return JSON:
{
  "summary": "In this episode, ...",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "wordCount": 150
}`;
  },

  parseResponse: (raw: string): SummaryOutput => {
    const cleaned = cleanLLMResponse(raw);
    const parsed: unknown = JSON.parse(cleaned);
    return summarySchema.parse(parsed);
  },
};
