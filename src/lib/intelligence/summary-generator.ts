// src/lib/intelligence/summary-generator.ts
//
// Generates transcript summaries using LLM analysis.
// Supports both single-pass and multi-chunk summarization.

import type { LLMProvider } from '@/lib/providers/llm';
import { summaryPrompt } from '@/prompts/summary';
import type { Summary } from '@/prompts/schemas';
import { summarySchema } from '@/prompts/schemas';
import type { Speaker } from '@/types';
import type { TranscriptChunk } from './transcript-chunker';
import { parseLLMResponseOrThrow } from './parse-guard';

export interface SummaryInput {
  sourceTitle: string;
  sourceType: string;
  chunks: TranscriptChunk[];
  speakers: Speaker[];
}

/**
 * Generate a summary from chunked transcript content.
 * For short content (1 chunk), runs a single pass.
 * For long content, summarizes each chunk then produces a final summary.
 */
export async function generateSummary(
  llm: LLMProvider,
  input: SummaryInput,
): Promise<Summary> {
  const speakerInfo = input.speakers.map((s) => ({
    id: s.id,
    label: s.label,
    role: s.role,
    talkTimePct: s.talkTimePct,
  }));

  if (input.chunks.length <= 1) {
    const content = input.chunks[0]?.text ?? '';
    return summarizeContent(llm, content, input.sourceTitle, input.sourceType, speakerInfo);
  }

  // Multi-chunk: summarize each chunk, then summarize summaries
  const chunkSummaries = await Promise.all(
    input.chunks.map((chunk) =>
      summarizeContent(llm, chunk.text, input.sourceTitle, input.sourceType, speakerInfo),
    ),
  );

  // Merge chunk summaries into a single text and run final summarization
  const mergedText = chunkSummaries
    .map((s, i) => `--- Section ${i + 1} ---\n${s.summary}\n\nKey points:\n${s.keyInsights.map((k) => `- ${k}`).join('\n')}`)
    .join('\n\n');

  return summarizeContent(
    llm,
    mergedText,
    input.sourceTitle,
    `${input.sourceType} (consolidated from ${input.chunks.length} sections)`,
    speakerInfo,
  );
}

// ─── Internal ──────────────────────────────────────────────────────

async function summarizeContent(
  llm: LLMProvider,
  content: string,
  sourceTitle: string,
  sourceType: string,
  speakers: { id: string; label: string; role?: string; talkTimePct: number }[],
): Promise<Summary> {
  const messages = [
    { role: 'system' as const, content: summaryPrompt.system },
    {
      role: 'user' as const,
      content: summaryPrompt.buildUserMessage({
        sourceTitle,
        sourceType,
        content,
        speakers,
      }),
    },
  ];

  const response = await llm.chat(messages, {
    model: summaryPrompt.model,
    temperature: summaryPrompt.temperature,
    maxTokens: summaryPrompt.maxTokens,
  });

  return parseLLMResponseOrThrow(response.content, summarySchema, 'summary generation');
}
