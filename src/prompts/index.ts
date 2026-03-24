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

// New intelligence prompts
export { keyInsightsPrompt } from './key-insights';
export { notableQuotesPrompt } from './notable-quotes';
export { hookTitlePrompt } from './hook-title';

// Re-export types and schemas for convenience
export type { PromptTemplate, SpeakerInfo, BaseContentParams } from './types';
export {
  clipAnalysisResponseSchema,
  clipCandidateSchema,
  scoreFactorsSchema,
  speakerRoleResultSchema,
  linkedinPostsResponseSchema,
  linkedinPostSchema,
  xThreadsResponseSchema,
  xThreadSchema,
  threadPostSchema,
  newsletterSectionsResponseSchema,
  newsletterSectionSchema,
  summarySchema,
  chapterMarkersSchema,
  chapterMarkerSchema,
  refinementResultSchema,
  blogDraftSchema,
} from './schemas';
export type {
  ClipCandidate,
  ScoreFactors,
  SpeakerRoleResult,
  LinkedinPost,
  XThread,
  ThreadPost,
  NewsletterSection,
  Summary,
  ChapterMarkers,
  ChapterMarker,
  RefinementResult,
  BlogDraft,
} from './schemas';

// Intelligence layer schemas
export {
  expandedScoreFactorsSchema,
  SCORE_WEIGHTS,
  scoredClipCandidateSchema,
  scoredClipResponseSchema,
  keyInsightSchema,
  keyInsightsResponseSchema,
  notableQuoteSchema,
  notableQuotesResponseSchema,
  hookTitlePairSchema,
  hookTitleResponseSchema,
} from './schemas/intelligence';
export type {
  ExpandedScoreFactors,
  ScoredClipCandidate,
  KeyInsight,
  KeyInsightsResponse,
  NotableQuote,
  NotableQuotesResponse,
  HookTitlePair,
  HookTitleResponse,
} from './schemas/intelligence';
