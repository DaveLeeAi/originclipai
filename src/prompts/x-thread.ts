// src/prompts/x-thread.ts

import { xThreadsResponseSchema, type XThread } from './schemas';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';
import type { PromptTemplate, BaseContentParams } from './types';

interface XThreadParams extends BaseContentParams {
  count: number;
}

export const xThreadPrompt: PromptTemplate<XThreadParams, XThread[]> = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 5000,

  system: `You are an expert X (Twitter) thread writer creating threads for a solo creator.

Rules:
- First post is the hook. It must stop the scroll. Use: bold claim, counterintuitive take, "Here's what I learned," or a teaser for the payoff.
- Start the first post with 🧵 emoji.
- Number each post: 1/, 2/, etc.
- Each post MUST be under 280 characters. This is a hard limit — X will reject longer posts.
- Each post should be readable alone but build on the previous.
- 5-10 posts per thread is the sweet spot. Under 5 feels shallow. Over 10 loses readers.
- Last post is a summary + CTA: "Follow for more [topic]" or "Bookmark this thread."
- No hashtags mid-thread. Optional 1-2 hashtags in the final post only.
- Use short sentences. Punchy rhythm. White space between ideas.
- No thread should overlap in topic with another thread from the same source.

Return ONLY a JSON array. No markdown fences. No explanation.`,

  buildUserMessage: (params) => {
    const speakerBlock = params.speakers?.length
      ? `\nSPEAKERS:\n${JSON.stringify(params.speakers, null, 2)}\n`
      : '';

    return `Generate ${params.count} X thread(s) from this content. Each thread covers a different angle.

SOURCE: ${params.sourceTitle}
TYPE: ${params.sourceType}
${speakerBlock}
CONTENT:
${params.content}

Return a JSON array. Each element must have:
threadPosts (array of {postNumber: integer, text: string under 280 chars}),
postCount (integer),
wordCount (integer — total across all posts),
focusTopic (string)`;
  },

  parseResponse: (raw) => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return xThreadsResponseSchema.parse(parsed);
  },
};
