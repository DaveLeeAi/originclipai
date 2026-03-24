import { z } from "zod";
import { cleanLLMResponse } from "@/lib/llm/response-cleaner";

export const newsletterSectionSchema = z.object({
  content: z.string().min(100).max(5000),
  wordCount: z.number().int().min(100).max(1000),
  sectionTitle: z.string().min(5),
  focusTopic: z.string().min(3),
});

export const newsletterSectionsResponseSchema = z
  .array(newsletterSectionSchema)
  .min(1)
  .max(3);

export type NewsletterSectionOutput = z.infer<typeof newsletterSectionSchema>;

export interface NewsletterSectionParams {
  sourceTitle: string;
  sourceType: string;
  speakerInfo: string;
  content: string;
  count: number;
}

export const newsletterSectionPrompt = {
  version: "1.0",
  model: "claude-sonnet-4-20250514",
  temperature: 0.7,
  maxTokens: 4000,

  system: `You are a newsletter writer creating sections for a creator's weekly email newsletter. The tone should be conversational, insightful, and personal — like a smart friend summarizing what they learned this week.

Newsletter section rules:
- 300-600 words
- Conversational tone (first person, "I")
- Reference the source naturally
- Include 2-3 key takeaways woven into the narrative
- End with a reflection or question
- No bullet point lists (narrative format)
- Ready to paste into Substack, ConvertKit, or Beehiiv

Return ONLY a JSON array. No other text.`,

  buildUserMessage: (params: NewsletterSectionParams): string => {
    return `Generate ${params.count} newsletter section(s) from this content.

SOURCE: ${params.sourceTitle}
TYPE: ${params.sourceType}
SPEAKERS: ${params.speakerInfo}

CONTENT:
${params.content}

Return JSON array:
[
  {
    "content": "This Week's Deep Dive: The Content Systems Framework\\n\\nI sat down with...",
    "wordCount": 450,
    "sectionTitle": "This Week's Deep Dive: The Content Systems Framework",
    "focusTopic": "content systems"
  }
]`;
  },

  parseResponse: (raw: string): NewsletterSectionOutput[] => {
    const cleaned = cleanLLMResponse(raw);
    const parsed: unknown = JSON.parse(cleaned);
    return newsletterSectionsResponseSchema.parse(parsed);
  },
};
