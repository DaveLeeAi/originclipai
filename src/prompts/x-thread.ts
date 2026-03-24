import { z } from "zod";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";

const threadPostSchema = z.object({
  postNumber: z.number().int().min(1),
  text: z.string().min(10).max(280),
});

export const xThreadSchema = z.object({
  threadPosts: z.array(threadPostSchema).min(3).max(15),
  postCount: z.number().int().min(3).max(15),
  wordCount: z.number().int(),
  focusTopic: z.string().min(3),
});

export const xThreadsResponseSchema = z.array(xThreadSchema).min(1).max(3);

export type XThreadOutput = z.infer<typeof xThreadSchema>;

export interface XThreadParams {
  sourceTitle: string;
  content: string;
  count: number;
}

export const xThreadPrompt = {
  version: "1.0",
  model: "claude-sonnet-4-20250514",
  temperature: 0.7,
  maxTokens: 4000,

  system: `You are an expert X (Twitter) thread writer. You create threads that are engaging, well-structured, and optimized for the X algorithm.

X thread rules:
- First post is the hook — it must make someone stop scrolling
- Number each post (1/, 2/, etc.)
- Each post is self-contained but builds on the previous
- 5-10 posts per thread ideal
- Last post is a summary + CTA (follow, bookmark, repost)
- Each post under 280 characters
- No hashtags mid-thread (optional 1-2 in last post)

Return ONLY a JSON array. No other text.`,

  buildUserMessage: (params: XThreadParams): string => {
    return `Generate ${params.count} X thread(s) from this content.

SOURCE: ${params.sourceTitle}
CONTENT:
${params.content}

Return JSON array:
[
  {
    "threadPosts": [
      {"postNumber": 1, "text": "Why I stopped posting daily content (and grew faster)\\n\\n1/"},
      {"postNumber": 2, "text": "For 3 years I was on the content hamster wheel. Every day: write, record, edit, post.\\n\\n2/"}
    ],
    "postCount": 7,
    "wordCount": 420,
    "focusTopic": "content quality vs. quantity"
  }
]`;
  },

  parseResponse: (raw: string): XThreadOutput[] => {
    const cleaned = cleanLLMResponse(raw);
    const parsed: unknown = JSON.parse(cleaned);
    return xThreadsResponseSchema.parse(parsed);
  },
};
