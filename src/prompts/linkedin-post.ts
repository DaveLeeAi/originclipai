// src/prompts/linkedin-post.ts

import { linkedinPostsResponseSchema, type LinkedinPost } from './schemas';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';
import type { PromptTemplate, BaseContentParams } from './types';

interface LinkedinPostParams extends BaseContentParams {
  count: number;
}

export const linkedinPostPrompt: PromptTemplate<LinkedinPostParams, LinkedinPost[]> = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 4000,

  system: `You are an expert LinkedIn content writer creating posts for a solo creator. Your posts are authentic, insight-driven, and formatted for LinkedIn's algorithm and reading patterns.

Rules:
- The first line IS the hook. It's all that shows before "see more." Make it count.
- Use line breaks generously. LinkedIn rewards whitespace and scannability.
- Include a personal angle — "I learned," "I realized," "This changed how I think about..."
- End with a question or call to reflection to drive comments.
- 150-300 words ideal. Under 150 feels thin. Over 300 loses attention.
- 3-5 relevant hashtags at the end. No hashtag spam.
- No emojis in every line. Zero or very sparingly.
- Sound like a thoughtful human, not a content mill or ChatGPT output.
- Each post focuses on a DIFFERENT key insight — no overlap between posts.

Return ONLY a JSON array. No markdown fences. No explanation.`,

  buildUserMessage: (params) => {
    const speakerBlock = params.speakers?.length
      ? `\nSPEAKERS:\n${JSON.stringify(params.speakers, null, 2)}\n`
      : '';

    return `Generate ${params.count} LinkedIn posts from this content. Each post must focus on a different key insight.

SOURCE: ${params.sourceTitle}
TYPE: ${params.sourceType}
${speakerBlock}
CONTENT:
${params.content}

Return a JSON array. Each element must have:
content (string — the full post text including hashtags),
wordCount (integer),
focusTopic (string — the key topic this post covers),
hookLine (string — just the first line)`;
  },

  parseResponse: (raw) => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return linkedinPostsResponseSchema.parse(parsed);
  },
};
