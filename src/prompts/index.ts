// src/prompts/index.ts

/**
 * All prompt templates for OriginClipAI.
 *
 * Usage:
 *   import { clipAnalysisPrompt } from '@/prompts';
 *   const clips = clipAnalysisPrompt.parseResponse(rawLLMOutput);
 *
 * Every prompt template conforms to PromptTemplate<TParams, TOutput>.
 * Every response is validated through Zod before use.
 */

export { clipAnalysisPrompt } from './clip-analysis';
export { speakerRolesPrompt } from './speaker-roles';
export { linkedinPostPrompt } from './linkedin-post';
export { xThreadPrompt } from './x-thread';
export { newsletterSectionPrompt } from './newsletter-section';
export { summaryPrompt } from './summary';
export { chapterMarkersPrompt } from './chapter-markers';
export { textRefinementPrompt } from './text-refinement';
export { customTemplatePrompt } from './custom-template';

// Re-export types and schemas for convenience
export type { PromptTemplate, SpeakerInfo, BaseContentParams } from './types';
export * from './schemas';
