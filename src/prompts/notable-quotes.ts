// src/prompts/notable-quotes.ts

import { notableQuotesResponseSchema, type NotableQuotesResponse } from './schemas/intelligence';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';
import type { PromptTemplate, BaseContentParams } from './types';

interface NotableQuotesParams extends BaseContentParams {
  maxQuotes: number;
}

export const notableQuotesPrompt: PromptTemplate<NotableQuotesParams, NotableQuotesResponse> = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.3,
  maxTokens: 4000,

  system: `You are extracting the most quotable, memorable moments from a transcript or article. These quotes will be used for social media posts, audiograms, quote cards, and newsletter pull-quotes.

A great quote:
- Is punchy and self-contained — reads well in isolation
- Has rhetorical punch: rhythm, contrast, surprise, or emotion
- Expresses a real opinion, not a hedge ("I think maybe possibly...")
- Is attributed to a specific speaker
- Is close to verbatim from the transcript (minor cleanup for readability is OK)

What to AVOID:
- Generic motivational fluff
- Questions from the host (unless unusually sharp)
- Incomplete thoughts or trailing sentences
- Anything that requires context to make sense

Impact categories:
- provocative: Challenges conventional thinking
- insightful: Reveals a non-obvious truth
- humorous: Genuinely funny or witty
- vulnerable: Personal admission, failure, or honest reflection
- contrarian: Goes against the mainstream view
- motivational: Inspires action with specificity (not generic)
- practical: Gives a concrete, usable tip

Return ONLY a JSON object. No markdown fences. No explanation.`,

  buildUserMessage: (params) => {
    const speakerBlock = params.speakers?.length
      ? `\nSPEAKERS:\n${JSON.stringify(params.speakers, null, 2)}\n`
      : '';

    return `Extract the top ${params.maxQuotes} most quotable moments from this content.

SOURCE: ${params.sourceTitle}
TYPE: ${params.sourceType}
${speakerBlock}
CONTENT:
${params.content}

Return a JSON object with:
quotes (array of {quote, speakerId, speakerLabel, approximateTimestamp, context, impact, socialReady})`;
  },

  parseResponse: (raw) => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return notableQuotesResponseSchema.parse(parsed);
  },
};
