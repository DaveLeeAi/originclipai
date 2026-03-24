import { describe, it, expect } from 'vitest';
import {
  chunkTranscriptSegments,
  chunkPlainText,
  estimateTokens,
} from '@/lib/intelligence/transcript-chunker';
import type { TranscriptSegment, Speaker } from '@/types';

const makeSpeakers = (): Speaker[] => [
  { id: 'S1', label: 'Host', role: 'host', talkTimePct: 40, talkTimeSeconds: 480 },
  { id: 'S2', label: 'Guest', role: 'guest', talkTimePct: 60, talkTimeSeconds: 720 },
];

const makeSegments = (count: number, charsPerSegment: number = 200): TranscriptSegment[] =>
  Array.from({ length: count }, (_, i) => ({
    start: i * 10,
    end: (i + 1) * 10,
    text: `Segment ${i}: ${'x'.repeat(charsPerSegment - 15)}`,
    speakerId: i % 2 === 0 ? 'S1' : 'S2',
    confidence: 0.95,
  }));

describe('chunkTranscriptSegments', () => {
  it('returns empty array for empty segments', () => {
    const result = chunkTranscriptSegments([], makeSpeakers());
    expect(result).toEqual([]);
  });

  it('returns single chunk for short transcripts', () => {
    const segments = makeSegments(5, 100);
    const result = chunkTranscriptSegments(segments, makeSpeakers());
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(0);
    expect(result[0].segmentCount).toBe(5);
    expect(result[0].speakerIds).toContain('S1');
    expect(result[0].speakerIds).toContain('S2');
  });

  it('creates multiple chunks for long transcripts', () => {
    // 100 segments x 200 chars = 20,000 chars; should need multiple chunks
    const segments = makeSegments(100, 200);
    const result = chunkTranscriptSegments(segments, makeSpeakers(), {
      targetChunkChars: 3000,
      maxChunkChars: 4000,
      overlapChars: 300,
    });
    expect(result.length).toBeGreaterThan(1);
    // Each chunk should be within bounds
    for (const chunk of result) {
      expect(chunk.charCount).toBeLessThanOrEqual(5000); // some buffer for labels
    }
  });

  it('preserves start and end times per chunk', () => {
    const segments = makeSegments(20, 200);
    const result = chunkTranscriptSegments(segments, makeSpeakers(), {
      targetChunkChars: 2000,
      maxChunkChars: 3000,
      overlapChars: 0,
    });
    expect(result.length).toBeGreaterThan(1);
    expect(result[0].startTime).toBe(0);
    expect(result[result.length - 1].endTime).toBe(200); // 20 segments x 10s
  });

  it('includes speaker labels when enabled', () => {
    const segments = makeSegments(3, 50);
    const result = chunkTranscriptSegments(segments, makeSpeakers(), {
      includeSpeakerLabels: true,
    });
    expect(result[0].text).toContain('[Host]');
    expect(result[0].text).toContain('[Guest]');
  });

  it('excludes speaker labels when disabled', () => {
    const segments = makeSegments(3, 50);
    const result = chunkTranscriptSegments(segments, makeSpeakers(), {
      includeSpeakerLabels: false,
    });
    expect(result[0].text).not.toContain('[Host]');
    expect(result[0].text).not.toContain('[Guest]');
  });

  it('tracks word count per chunk', () => {
    const segments = makeSegments(5, 100);
    const result = chunkTranscriptSegments(segments, makeSpeakers());
    expect(result[0].wordCount).toBeGreaterThan(0);
  });
});

describe('chunkPlainText', () => {
  it('returns empty array for empty text', () => {
    expect(chunkPlainText('')).toEqual([]);
    expect(chunkPlainText('  ')).toEqual([]);
  });

  it('returns single chunk for short text', () => {
    const text = 'This is a short article. It has two sentences.';
    const result = chunkPlainText(text);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('short article');
    expect(result[0].speakerIds).toEqual([]);
    expect(result[0].startTime).toBe(0);
  });

  it('splits long text into multiple chunks', () => {
    const sentence = 'This is a test sentence with enough words to matter. ';
    const text = sentence.repeat(200); // ~10,000 chars
    const result = chunkPlainText(text, {
      targetChunkChars: 2000,
      maxChunkChars: 3000,
      overlapChars: 200,
    });
    expect(result.length).toBeGreaterThan(1);
  });

  it('respects sentence boundaries', () => {
    const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
    const result = chunkPlainText(text, {
      targetChunkChars: 30,
      maxChunkChars: 60,
      overlapChars: 0,
    });
    // Each chunk should not cut mid-sentence
    for (const chunk of result) {
      const trimmed = chunk.text.trim();
      if (trimmed.length > 0) {
        expect(trimmed).toMatch(/[.!?]\s*$/);
      }
    }
  });
});

describe('estimateTokens', () => {
  it('estimates ~4 chars per token', () => {
    expect(estimateTokens('hello world')).toBe(3); // 11 chars / 4 = 2.75 → ceil = 3
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('gives reasonable estimates for longer text', () => {
    const text = 'a'.repeat(4000);
    expect(estimateTokens(text)).toBe(1000);
  });
});
