// src/prompts/custom-template.ts

import { z } from 'zod';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';
import type { PromptTemplate, BaseContentParams } from './types';

interface CustomTemplateParams extends BaseContentParams {
  templateName: string;
  templatePrompt: string; // The user's custom prompt text
}

interface CustomTemplateResult {
  content: string;
  wordCount: number;
}

const customTemplateResultSchema = z.object({
  content: z.string().min(10),
  wordCount: z.number().int().min(1),
});

export const customTemplatePrompt: PromptTemplate<CustomTemplateParams, CustomTemplateResult> = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 4000,

  system: `You are executing a custom content generation template defined by the creator. Follow their template instructions exactly. Generate content based on the source material provided.

Rules:
- Follow the template instructions as closely as possible.
- Use the source content as your knowledge base — do not invent facts.
- If the template asks for a specific format, match it exactly.
- If the template is vague, produce a well-structured piece that makes the source content useful.
- Attribute insights to speakers when speaker data is available.

Return ONLY a JSON object with "content" (string) and "wordCount" (integer). No markdown fences. No explanation.`,

  buildUserMessage: (params) => {
    const speakerBlock = params.speakers?.length
      ? `\nSPEAKERS:\n${JSON.stringify(params.speakers, null, 2)}\n`
      : '';

    return `Execute this custom content template.

TEMPLATE NAME: ${params.templateName}
TEMPLATE INSTRUCTIONS:
${params.templatePrompt}

SOURCE: ${params.sourceTitle}
TYPE: ${params.sourceType}
${speakerBlock}
SOURCE CONTENT:
${params.content}

Return a JSON object with:
content (string — the generated content following the template instructions),
wordCount (integer)`;
  },

  parseResponse: (raw) => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return customTemplateResultSchema.parse(parsed);
  },
};
