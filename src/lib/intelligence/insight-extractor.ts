// src/lib/intelligence/insight-extractor.ts
//
// Extracts key insights and notable quotes from transcript content.
// Operates on chunks to handle long transcripts within token limits.

import type { LLMProvider } from '@/lib/providers/llm';
import { keyInsightsPrompt } from '@/prompts/key-insights';
import { notableQuotesPrompt } from '@/prompts/notable-quotes';
import type { KeyInsightsResponse, NotableQuotesResponse } from '@/prompts/schemas/intelligence';
import type { Speaker } from '@/types';
import type { TranscriptChunk } from './transcript-chunker';
import { parseLLMResponseOrThrow } from './parse-guard';
import { keyInsightsResponseSchema, notableQuotesResponseSchema } from '@/prompts/schemas/intelligence';

export interface InsightExtractionInput {
  sourceTitle: string;
  sourceType: string;
  chunks: TranscriptChunk[];
  speakers: Speaker[];
  maxInsights?: number;
  maxQuotes?: number;
}

export interface InsightExtractionResult {
  insights: KeyInsightsResponse;
  quotes: NotableQuotesResponse;
}

/**
 * Extract insights and quotes from chunked transcript content.
 * For short content (1 chunk), runs a single pass.
 * For long content (multiple chunks), runs per-chunk then merges.
 */
export async function extractInsightsAndQuotes(
  llm: LLMProvider,
  input: InsightExtractionInput,
): Promise<InsightExtractionResult> {
  const maxInsights = input.maxInsights ?? 10;
  const maxQuotes = input.maxQuotes ?? 8;

  const speakerInfo = input.speakers.map((s) => ({
    id: s.id,
    label: s.label,
    role: s.role,
    talkTimePct: s.talkTimePct,
  }));

  if (input.chunks.length <= 1) {
    // Single chunk — direct extraction
    const content = input.chunks[0]?.text ?? '';
    const [insights, quotes] = await Promise.all([
      extractInsights(llm, content, input.sourceTitle, input.sourceType, speakerInfo, maxInsights),
      extractQuotes(llm, content, input.sourceTitle, input.sourceType, speakerInfo, maxQuotes),
    ]);
    return { insights, quotes };
  }

  // Multi-chunk — extract per-chunk then merge
  const perChunkInsights: KeyInsightsResponse[] = [];
  const perChunkQuotes: NotableQuotesResponse[] = [];

  // Process chunks in parallel batches of 3 to avoid rate limiting
  const batchSize = 3;
  for (let i = 0; i < input.chunks.length; i += batchSize) {
    const batch = input.chunks.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (chunk) => {
        const [insights, quotes] = await Promise.all([
          extractInsights(llm, chunk.text, input.sourceTitle, input.sourceType, speakerInfo, Math.ceil(maxInsights / input.chunks.length) + 2),
          extractQuotes(llm, chunk.text, input.sourceTitle, input.sourceType, speakerInfo, Math.ceil(maxQuotes / input.chunks.length) + 2),
        ]);
        return { insights, quotes };
      }),
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        perChunkInsights.push(result.value.insights);
        perChunkQuotes.push(result.value.quotes);
      }
    }
  }

  return {
    insights: mergeInsights(perChunkInsights, maxInsights),
    quotes: mergeQuotes(perChunkQuotes, maxQuotes),
  };
}

/**
 * Extract insights only (without quotes).
 */
export async function extractInsightsOnly(
  llm: LLMProvider,
  content: string,
  sourceTitle: string,
  sourceType: string,
  speakers: { id: string; label: string; role?: string; talkTimePct: number }[],
  maxInsights: number = 10,
): Promise<KeyInsightsResponse> {
  return extractInsights(llm, content, sourceTitle, sourceType, speakers, maxInsights);
}

/**
 * Extract quotes only (without insights).
 */
export async function extractQuotesOnly(
  llm: LLMProvider,
  content: string,
  sourceTitle: string,
  sourceType: string,
  speakers: { id: string; label: string; role?: string; talkTimePct: number }[],
  maxQuotes: number = 8,
): Promise<NotableQuotesResponse> {
  return extractQuotes(llm, content, sourceTitle, sourceType, speakers, maxQuotes);
}

// ─── Internal ──────────────────────────────────────────────────────

async function extractInsights(
  llm: LLMProvider,
  content: string,
  sourceTitle: string,
  sourceType: string,
  speakers: { id: string; label: string; role?: string; talkTimePct: number }[],
  maxInsights: number,
): Promise<KeyInsightsResponse> {
  const messages = [
    { role: 'system' as const, content: keyInsightsPrompt.system },
    {
      role: 'user' as const,
      content: keyInsightsPrompt.buildUserMessage({
        sourceTitle,
        sourceType,
        content,
        speakers,
        maxInsights,
      }),
    },
  ];

  const response = await llm.chat(messages, {
    model: keyInsightsPrompt.model,
    temperature: keyInsightsPrompt.temperature,
    maxTokens: keyInsightsPrompt.maxTokens,
  });

  return parseLLMResponseOrThrow(response.content, keyInsightsResponseSchema, 'insight extraction');
}

async function extractQuotes(
  llm: LLMProvider,
  content: string,
  sourceTitle: string,
  sourceType: string,
  speakers: { id: string; label: string; role?: string; talkTimePct: number }[],
  maxQuotes: number,
): Promise<NotableQuotesResponse> {
  const messages = [
    { role: 'system' as const, content: notableQuotesPrompt.system },
    {
      role: 'user' as const,
      content: notableQuotesPrompt.buildUserMessage({
        sourceTitle,
        sourceType,
        content,
        speakers,
        maxQuotes,
      }),
    },
  ];

  const response = await llm.chat(messages, {
    model: notableQuotesPrompt.model,
    temperature: notableQuotesPrompt.temperature,
    maxTokens: notableQuotesPrompt.maxTokens,
  });

  return parseLLMResponseOrThrow(response.content, notableQuotesResponseSchema, 'quote extraction');
}

function mergeInsights(
  results: KeyInsightsResponse[],
  maxInsights: number,
): KeyInsightsResponse {
  const allInsights = results.flatMap((r) => r.insights);

  // Sort by confidence descending, then deduplicate by similarity
  const sorted = allInsights.sort((a, b) => b.confidence - a.confidence);
  const deduped = deduplicateByField(sorted, (item) => item.insight.toLowerCase().slice(0, 50));
  const topInsights = deduped.slice(0, maxInsights);

  return {
    insights: topInsights,
    topicSummary: results[0]?.topicSummary ?? '',
  };
}

function mergeQuotes(
  results: NotableQuotesResponse[],
  maxQuotes: number,
): NotableQuotesResponse {
  const allQuotes = results.flatMap((r) => r.quotes);

  // Deduplicate by quote text similarity
  const deduped = deduplicateByField(allQuotes, (item) => item.quote.toLowerCase().slice(0, 50));
  // Prioritize social-ready quotes
  const sorted = deduped.sort((a, b) => {
    if (a.socialReady && !b.socialReady) return -1;
    if (!a.socialReady && b.socialReady) return 1;
    return 0;
  });

  return {
    quotes: sorted.slice(0, maxQuotes),
  };
}

function deduplicateByField<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
