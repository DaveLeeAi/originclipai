// src/prompts/types.ts

import type { z } from 'zod';

/**
 * Every prompt template must conform to this interface.
 * Prompts are data objects — not classes, not functions.
 */
export interface PromptTemplate<TParams, TOutput> {
  /** Semantic version. Increment when prompt changes. */
  version: string;

  /** Claude model to use */
  model: string;

  /** Temperature: 0.3 for analysis (consistency), 0.7 for generation (variety) */
  temperature: number;

  /** Max tokens for response */
  maxTokens: number;

  /** System message — sets the LLM's role and output format */
  system: string;

  /** Builds the user message from typed parameters */
  buildUserMessage: (params: TParams) => string;

  /** Parses and validates the raw LLM response string into typed output */
  parseResponse: (raw: string) => TOutput;
}

/**
 * Speaker data passed to prompts that need speaker context.
 */
export interface SpeakerInfo {
  id: string;
  label: string;
  role?: string;
  talkTimePct: number;
  talkTimeSeconds?: number;
}

/**
 * Common parameters shared across multiple prompts.
 */
export interface BaseContentParams {
  sourceTitle: string;
  sourceType: string;
  content: string; // Transcript text or article text
  speakers?: SpeakerInfo[];
}
