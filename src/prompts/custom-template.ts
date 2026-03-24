import { z } from "zod";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";

export const customTemplateSchema = z.object({
  content: z.string().min(10),
  wordCount: z.number().int(),
});

export type CustomTemplateOutput = z.infer<typeof customTemplateSchema>;

export interface CustomTemplateParams {
  template: string;
  sourceTitle: string;
  content: string;
}

export const customTemplatePrompt = {
  version: "1.0",
  model: "claude-sonnet-4-20250514",
  temperature: 0.7,
  maxTokens: 4000,

  system: `You execute custom content generation templates provided by the user. Return ONLY JSON, no other text.`,

  buildUserMessage: (params: CustomTemplateParams): string => {
    return `Execute this custom content generation template.

TEMPLATE:
${params.template}

SOURCE: ${params.sourceTitle}
CONTENT:
${params.content}

Return JSON:
{
  "content": "...",
  "wordCount": 0
}`;
  },

  parseResponse: (raw: string): CustomTemplateOutput => {
    const cleaned = cleanLLMResponse(raw);
    const parsed: unknown = JSON.parse(cleaned);
    return customTemplateSchema.parse(parsed);
  },
};
