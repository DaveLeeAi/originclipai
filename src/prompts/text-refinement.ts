// src/prompts/text-refinement.ts

import { refinementResultSchema, type RefinementResult } from './schemas';
import { cleanLLMResponse } from '@/lib/llm/response-cleaner';
import type { PromptTemplate } from './types';

interface TextRefinementParams {
  currentText: string;
  outputType: string; // 'linkedin_post', 'x_thread', 'newsletter_section', etc.
  instruction: string; // User's refinement instruction
}

export const textRefinementPrompt: PromptTemplate<TextRefinementParams, RefinementResult> = {
  version: '1.0',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.5,
  maxTokens: 3000,

  system: `You are refining a piece of content based on the creator's instruction. 

Rules:
- Keep the core message and insights intact.
- Only change what the instruction asks for.
- Maintain the same format and platform conventions (LinkedIn formatting for LinkedIn posts, 280-char limit for X posts, etc.).
- Do not add content that wasn't in the original unless the instruction specifically asks for it.
- If asked to "make it shorter," cut aggressively — remove the weakest sentences, not just trim words.
- If asked to "add a hook," write a genuinely compelling opening, not a generic "Did you know..." opener.
- If asked to "make it more casual/professional," adjust vocabulary and sentence structure, not just add/remove emojis.

Return ONLY a JSON object. No markdown fences. No explanation.`,

  buildUserMessage: (params) => {
    return `Refine this ${params.outputType.replace(/_/g, ' ')} based on the creator's instruction.

CURRENT TEXT:
${params.currentText}

INSTRUCTION: ${params.instruction}

Return a JSON object with:
refinedText (string — the updated text),
wordCount (integer),
changesMade (string — brief description of what you changed and why, under 100 words)`;
  },

  parseResponse: (raw) => {
    const cleaned = cleanLLMResponse(raw);
    const parsed = JSON.parse(cleaned);
    return refinementResultSchema.parse(parsed);
  },
};
