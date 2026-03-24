// src/prompts/summary.ts

import { summarySchema, type Summary } from './schemas';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';
import type { PromptTemplate, BaseContentParams } from './types';

export const summaryPrompt: PromptTemplate<BaseContentParams, Summary> = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.3,
  maxTokens: 2000,

  system: `You are generating a concise summary of content for a creator's reference. This summary will be used for show notes, YouTube descriptions, and internal reference.

Rules:
- 2-3 paragraphs. 100-250 words total.
- Lead with the main topic/thesis, not "In this episode..."
- Extract 3-7 key insights as standalone bullet-point takeaways.
- Be specific — include names, numbers, frameworks, and concrete examples from the content.
- Neutral, informative tone. Not promotional.

Return ONLY a JSON object. No markdown fences. No explanation.`,

  buildUserMessage: (params) => {
    const speakerBlock = params.speakers?.length
      ? `\nSPEAKERS:\n${JSON.stringify(params.speakers, null, 2)}\n`
      : '';

    return `Generate a summary and key insights from this content.

SOURCE: ${params.sourceTitle}
TYPE: ${params.sourceType}
${speakerBlock}
CONTENT:
${params.content}

Return a JSON object with:
summary (string — 2-3 paragraph summary),
keyInsights (array of strings — 3-7 specific takeaways),
wordCount (integer — word count of summary only)`;
  },

  parseResponse: (raw) => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return summarySchema.parse(parsed);
  },
};
