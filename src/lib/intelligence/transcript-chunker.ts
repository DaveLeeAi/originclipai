// src/lib/intelligence/transcript-chunker.ts
//
// Splits transcripts into processable chunks for LLM analysis.
// Respects speaker boundaries and sentence endings.

import type { TranscriptSegment, Speaker } from '@/types';

export interface TranscriptChunk {
  /** Chunk index (0-based) */
  index: number;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** The text content of this chunk */
  text: string;
  /** Approximate character count */
  charCount: number;
  /** Approximate word count */
  wordCount: number;
  /** Speaker IDs present in this chunk */
  speakerIds: string[];
  /** Original segments that comprise this chunk */
  segmentCount: number;
}

export interface ChunkOptions {
  /**
   * Target character count per chunk.
   * Chunks may be slightly larger to avoid splitting mid-sentence.
   * Default: 12000 (~3000 tokens)
   */
  targetChunkChars?: number;
  /**
   * Maximum character count per chunk (hard limit).
   * Default: 16000 (~4000 tokens)
   */
  maxChunkChars?: number;
  /**
   * Minimum overlap in characters between consecutive chunks.
   * Overlap preserves context at boundaries.
   * Default: 500
   */
  overlapChars?: number;
  /**
   * Whether to include speaker labels in the text.
   * Default: true
   */
  includeSpeakerLabels?: boolean;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  targetChunkChars: 12_000,
  maxChunkChars: 16_000,
  overlapChars: 500,
  includeSpeakerLabels: true,
};

/**
 * Chunk a transcript from segments with timestamps and speaker IDs.
 * Respects speaker turn boundaries when possible.
 */
export function chunkTranscriptSegments(
  segments: TranscriptSegment[],
  speakers: Speaker[],
  options?: ChunkOptions,
): TranscriptChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (segments.length === 0) {
    return [];
  }

  const speakerLabelMap = new Map(speakers.map((s) => [s.id, s.label]));
  const chunks: TranscriptChunk[] = [];

  let currentSegments: TranscriptSegment[] = [];
  let currentCharCount = 0;
  let chunkIndex = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentText = formatSegment(segment, speakerLabelMap, opts.includeSpeakerLabels);

    // Check if adding this segment would exceed the hard limit
    if (currentCharCount + segmentText.length > opts.maxChunkChars && currentSegments.length > 0) {
      // Flush the current chunk
      chunks.push(buildChunk(currentSegments, speakerLabelMap, chunkIndex, opts.includeSpeakerLabels));
      chunkIndex++;

      // Start new chunk with overlap
      currentSegments = getOverlapSegments(currentSegments, opts.overlapChars, speakerLabelMap, opts.includeSpeakerLabels);
      currentCharCount = currentSegments.reduce(
        (sum, s) => sum + formatSegment(s, speakerLabelMap, opts.includeSpeakerLabels).length,
        0,
      );
    }

    currentSegments.push(segment);
    currentCharCount += segmentText.length;

    // Check if we've hit the target size and this is a good split point
    if (currentCharCount >= opts.targetChunkChars) {
      const isGoodSplit = isSpeakerBoundary(segment, segments[i + 1])
        || endsWithSentence(segment.text);

      if (isGoodSplit || currentCharCount >= opts.maxChunkChars) {
        chunks.push(buildChunk(currentSegments, speakerLabelMap, chunkIndex, opts.includeSpeakerLabels));
        chunkIndex++;
        currentSegments = getOverlapSegments(currentSegments, opts.overlapChars, speakerLabelMap, opts.includeSpeakerLabels);
        currentCharCount = currentSegments.reduce(
          (sum, s) => sum + formatSegment(s, speakerLabelMap, opts.includeSpeakerLabels).length,
          0,
        );
      }
    }
  }

  // Flush remaining segments
  if (currentSegments.length > 0) {
    chunks.push(buildChunk(currentSegments, speakerLabelMap, chunkIndex, opts.includeSpeakerLabels));
  }

  return chunks;
}

/**
 * Chunk plain text (no segments) into overlapping chunks.
 * Used for article/PDF content that doesn't have timestamps.
 */
export function chunkPlainText(
  text: string,
  options?: Pick<ChunkOptions, 'targetChunkChars' | 'maxChunkChars' | 'overlapChars'>,
): TranscriptChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TranscriptChunk[] = [];
  const sentences = splitSentences(text);
  let currentText = '';
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    if (currentText.length + sentence.length > opts.maxChunkChars && currentText.length > 0) {
      chunks.push(buildPlainChunk(currentText, chunkIndex));
      chunkIndex++;

      // Keep overlap from end of current chunk
      const overlapText = currentText.slice(-opts.overlapChars);
      currentText = overlapText;
    }

    currentText += sentence;

    if (currentText.length >= opts.targetChunkChars) {
      chunks.push(buildPlainChunk(currentText, chunkIndex));
      chunkIndex++;
      const overlapText = currentText.slice(-opts.overlapChars);
      currentText = overlapText;
    }
  }

  if (currentText.trim().length > 0) {
    chunks.push(buildPlainChunk(currentText, chunkIndex));
  }

  return chunks;
}

/**
 * Estimate the number of LLM tokens for a chunk of text.
 * Rough heuristic: ~4 chars per token for English.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── Internal Helpers ──────────────────────────────────────────────

function formatSegment(
  segment: TranscriptSegment,
  speakerLabelMap: Map<string, string>,
  includeSpeakerLabels: boolean,
): string {
  if (includeSpeakerLabels) {
    const label = speakerLabelMap.get(segment.speakerId) ?? segment.speakerId;
    return `[${label}] ${segment.text}\n`;
  }
  return `${segment.text}\n`;
}

function buildChunk(
  segments: TranscriptSegment[],
  speakerLabelMap: Map<string, string>,
  index: number,
  includeSpeakerLabels: boolean,
): TranscriptChunk {
  const text = segments
    .map((s) => formatSegment(s, speakerLabelMap, includeSpeakerLabels))
    .join('');
  const speakerIds = Array.from(new Set(segments.map((s) => s.speakerId)));

  return {
    index,
    startTime: segments[0].start,
    endTime: segments[segments.length - 1].end,
    text,
    charCount: text.length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    speakerIds,
    segmentCount: segments.length,
  };
}

function buildPlainChunk(text: string, index: number): TranscriptChunk {
  return {
    index,
    startTime: 0,
    endTime: 0,
    text,
    charCount: text.length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    speakerIds: [],
    segmentCount: 0,
  };
}

function getOverlapSegments(
  segments: TranscriptSegment[],
  overlapChars: number,
  speakerLabelMap: Map<string, string>,
  includeSpeakerLabels: boolean,
): TranscriptSegment[] {
  if (overlapChars <= 0) return [];

  let charCount = 0;
  const overlap: TranscriptSegment[] = [];

  for (let i = segments.length - 1; i >= 0; i--) {
    const segText = formatSegment(segments[i], speakerLabelMap, includeSpeakerLabels);
    charCount += segText.length;
    overlap.unshift(segments[i]);
    if (charCount >= overlapChars) break;
  }

  return overlap;
}

function isSpeakerBoundary(
  current: TranscriptSegment,
  next?: TranscriptSegment,
): boolean {
  if (!next) return true;
  return current.speakerId !== next.speakerId;
}

function endsWithSentence(text: string): boolean {
  return /[.!?]\s*$/.test(text.trim());
}

function splitSentences(text: string): string[] {
  // Split on sentence boundaries while preserving the delimiter
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.map((p) => p + ' ');
}
