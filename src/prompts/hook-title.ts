// src/prompts/hook-title.ts

import { hookTitleResponseSchema, type HookTitleResponse } from './schemas/intelligence';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';
import type { PromptTemplate } from './types';

interface HookTitleParams {
  /** The clip's transcript excerpt */
  clipTranscript: string;
  /** Brief topic description */
  topicSummary: string;
  /** Who is the primary speaker */
  speakerRole: string;
  /** Number of hook/title options to generate */
  count: number;
}

export const hookTitlePrompt: PromptTemplate<HookTitleParams, HookTitleResponse> = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 2000,

  system: `You are a short-form video title and hook specialist. You create opening lines and titles that stop the scroll on TikTok, YouTube Shorts, and Instagram Reels.

TITLE rules:
- 5-12 words max
- No clickbait lies — it must deliver on the promise
- Use curiosity gaps, numbers, or bold claims
- No ALL CAPS. No excessive punctuation. No emojis.

HOOK rules (the opening spoken/text line):
- Must be the first thing the viewer hears or reads
- Under 15 words ideal — punchy, immediate
- Never start with "So," "Well," "Um," or "In this video"
- Use one of these rhetorical patterns:
  - question: "What if everything you know about X is wrong?"
  - bold_claim: "Most people will never understand this."
  - surprising_fact: "97% of creators make this same mistake."
  - story_opener: "I lost $50K before I learned this lesson."
  - contrarian: "Hustle culture is a lie. Here's proof."
  - teaser: "The strategy that tripled my revenue in 6 months."
  - confession: "I was completely wrong about this for years."

scrollStopScore (0-100):
- 90+: Would make you stop scrolling immediately
- 70-89: Strong — would catch attention of your target audience
- 50-69: Decent — works but not remarkable
- Below 50: Weak — needs rework

Return ONLY a JSON object. No markdown fences. No explanation.`,

  buildUserMessage: (params) => {
    return `Generate ${params.count} title + hook options for this clip.

TOPIC: ${params.topicSummary}
SPEAKER ROLE: ${params.speakerRole}

CLIP TRANSCRIPT:
${params.clipTranscript}

Return a JSON object with:
options (array of {title, hook, hookType, scrollStopScore})`;
  },

  parseResponse: (raw) => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return hookTitleResponseSchema.parse(parsed);
  },
};
