import { z } from "zod";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";

export const linkedinPostSchema = z.object({
  content: z.string().min(50).max(3000),
  wordCount: z.number().int().min(50).max(500),
  focusTopic: z.string().min(3),
  hookLine: z.string().min(10).max(200),
});

export const linkedinPostsResponseSchema = z.array(linkedinPostSchema).min(1).max(5);

export type LinkedinPostOutput = z.infer<typeof linkedinPostSchema>;

export interface LinkedinPostParams {
  sourceTitle: string;
  sourceType: string;
  content: string;
  speakerInfo: string;
  count: number;
}

export const linkedinPostPrompt = {
  version: "1.0",
  model: "claude-sonnet-4-20250514",
  temperature: 0.7,
  maxTokens: 4000,

  system: `You are an expert LinkedIn content writer. You create posts that are authentic, insight-driven, and formatted for LinkedIn's algorithm and audience.

LinkedIn post rules:
- Open with a hook (first line is all that shows before "see more")
- Use line breaks for readability (LinkedIn rewards whitespace)
- Include a personal angle or lesson learned
- End with a question or call to reflection
- 150-300 words ideal
- No hashtag spam (3-5 relevant hashtags max, at the end)
- No emojis in every line (sparingly, if at all)
- Sound like a human, not a content mill

Return ONLY a JSON array. No other text.`,

  buildUserMessage: (params: LinkedinPostParams): string => {
    return `Generate ${params.count} LinkedIn posts from this content.

SOURCE: ${params.sourceTitle}
TYPE: ${params.sourceType}

SPEAKER CONTEXT:
${params.speakerInfo}

CONTENT:
${params.content}

Each post should focus on a different key insight from the content.

Return JSON array:
[
  {
    "content": "Most creators burn out because they confuse activity with strategy.\\n\\nI spent 3 years posting daily before I realized...\\n\\nWhat system do you use to stay consistent?\\n\\n#contentcreation #strategy",
    "wordCount": 187,
    "focusTopic": "content consistency vs. systems",
    "hookLine": "Most creators burn out because they confuse activity with strategy."
  }
]`;
  },

  parseResponse: (raw: string): LinkedinPostOutput[] => {
    const cleaned = cleanLLMResponse(raw);
    const parsed: unknown = JSON.parse(cleaned);
    return linkedinPostsResponseSchema.parse(parsed);
  },
};
