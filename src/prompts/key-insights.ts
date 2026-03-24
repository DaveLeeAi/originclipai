// src/prompts/key-insights.ts

import { keyInsightsResponseSchema, type KeyInsightsResponse } from './schemas/intelligence';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';
import type { PromptTemplate, BaseContentParams } from './types';

interface KeyInsightParams extends BaseContentParams {
  maxInsights: number;
}

export const keyInsightsPrompt: PromptTemplate<KeyInsightParams, KeyInsightsResponse> = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.3,
  maxTokens: 4000,

  system: `You are a content analyst extracting the most valuable, non-obvious insights from a transcript or article.

An insight is NOT:
- A restatement of common knowledge ("Exercise is good for you")
- A vague platitude ("Success comes from hard work")
- A transition or filler statement

An insight IS:
- A specific, actionable framework or mental model
- A counterintuitive claim backed by reasoning or experience
- A concrete data point, stat, or case study result
- A named technique, process, or strategy
- A personal revelation that changes how you think about a topic

For each insight:
- State it as a standalone sentence that makes sense without context
- Explain WHY it matters in 1-2 sentences (significance)
- Identify who said it (speakerId) if multiple speakers
- Estimate when in the content it appears (approximate timestamp in seconds if available)
- Tag it with 1-3 topic keywords
- Rate your confidence (0-1) that this is a genuine insight vs. generic filler

Return ONLY a JSON object. No markdown fences. No explanation.`,

  buildUserMessage: (params) => {
    const speakerBlock = params.speakers?.length
      ? `\nSPEAKERS:\n${JSON.stringify(params.speakers, null, 2)}\n`
      : '';

    return `Extract the top ${params.maxInsights} most valuable insights from this content.

SOURCE: ${params.sourceTitle}
TYPE: ${params.sourceType}
${speakerBlock}
CONTENT:
${params.content}

Return a JSON object with:
insights (array of {insight, significance, speakerId, approximateTimestamp, tags, confidence}),
topicSummary (string — 1-2 sentence summary of the overall topic)`;
  },

  parseResponse: (raw) => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return keyInsightsResponseSchema.parse(parsed);
  },
};
