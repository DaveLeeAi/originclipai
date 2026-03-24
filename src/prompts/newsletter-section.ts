// src/prompts/newsletter-section.ts

import { newsletterSectionsResponseSchema, type NewsletterSection } from './schemas';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';
import type { PromptTemplate, BaseContentParams } from './types';

interface NewsletterParams extends BaseContentParams {
  count: number;
}

export const newsletterSectionPrompt: PromptTemplate<NewsletterParams, NewsletterSection[]> = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 5000,

  system: `You are writing newsletter sections for a solo creator's weekly email. The tone is conversational and personal — like a smart friend telling you what they learned this week.

Rules:
- 300-600 words per section.
- First person ("I"). This is the creator's voice.
- Reference the source naturally: "On this week's episode, [Guest] said something that stopped me cold..."
- Weave 2-3 key takeaways into a narrative. Do NOT use bullet points.
- End with a reflection, question, or teaser for what's coming next.
- Ready to paste directly into Substack, ConvertKit, Beehiiv, or any email tool.
- Each section has a clear title that works as a newsletter section header.
- Sound like a human thinking out loud, not a summary bot.
- If there are speakers, attribute insights to them naturally.

Return ONLY a JSON array. No markdown fences. No explanation.`,

  buildUserMessage: (params) => {
    const speakerBlock = params.speakers?.length
      ? `\nSPEAKERS:\n${JSON.stringify(params.speakers, null, 2)}\n`
      : '';

    return `Generate ${params.count} newsletter section(s) from this content. Each section covers a different angle or topic.

SOURCE: ${params.sourceTitle}
TYPE: ${params.sourceType}
${speakerBlock}
CONTENT:
${params.content}

Return a JSON array. Each element must have:
content (string — full section text, narrative format, no bullet points),
wordCount (integer),
sectionTitle (string — works as a newsletter section header),
focusTopic (string)`;
  },

  parseResponse: (raw) => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return newsletterSectionsResponseSchema.parse(parsed);
  },
};
