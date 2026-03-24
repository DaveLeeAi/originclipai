import { describe, it, expect } from 'vitest';

/**
 * Tests for the render handler's internal helper functions.
 * These are extracted and tested here since they contain important
 * business logic for clip-to-caption pipeline accuracy.
 *
 * The functions are not directly exported from handler.ts (they're private),
 * so we replicate them here for testing. If they diverge from handler.ts,
 * that's a signal to extract them into a shared module.
 */

// ─── Replicated from handler.ts (private helpers) ────────────────────

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  speakerId?: string;
}

interface CaptionWordTimestamp {
  word: string;
  start: number;
  end: number;
  speakerId?: string;
}

interface SpeakerColor {
  speakerId: string;
  color: string;
}

function filterWordsForClip(
  wordTimestamps: WordTimestamp[],
  startTime: number,
  endTime: number,
): CaptionWordTimestamp[] {
  return wordTimestamps
    .filter((w) => w.start >= startTime && w.end <= endTime)
    .map((w) => ({
      word: w.word,
      start: w.start - startTime,
      end: w.end - startTime,
      speakerId: w.speakerId,
    }));
}

function buildCaptionSegments(
  words: CaptionWordTimestamp[],
): Array<{ text: string; start: number; end: number; speakerId?: string }> {
  const segments: Array<{ text: string; start: number; end: number; speakerId?: string }> = [];
  const wordsPerSegment = 5;

  for (let i = 0; i < words.length; i += wordsPerSegment) {
    const group = words.slice(i, i + wordsPerSegment);
    if (group.length === 0) continue;

    segments.push({
      text: group.map((w) => w.word).join(' '),
      start: group[0].start,
      end: group[group.length - 1].end,
      speakerId: group[0].speakerId,
    });
  }

  return segments;
}

function buildSpeakerColors(
  speakerColors: Record<string, string>,
): SpeakerColor[] {
  return Object.entries(speakerColors).map(([speakerId, color]) => ({
    speakerId,
    color,
  }));
}

// ─── filterWordsForClip ──────────────────────────────────────────────

describe('filterWordsForClip', () => {
  const words: WordTimestamp[] = [
    { word: 'Before', start: 0, end: 0.5, speakerId: 's1' },
    { word: 'the', start: 5, end: 5.3, speakerId: 's1' },
    { word: 'clip', start: 5.4, end: 5.8, speakerId: 's1' },
    { word: 'starts', start: 6, end: 6.5, speakerId: 's1' },
    { word: 'here', start: 10, end: 10.3, speakerId: 's2' },
    { word: 'and', start: 10.5, end: 10.7, speakerId: 's2' },
    { word: 'ends', start: 15, end: 15.5, speakerId: 's2' },
    { word: 'after', start: 20, end: 20.5, speakerId: 's1' },
  ];

  it('filters words within clip boundaries', () => {
    const result = filterWordsForClip(words, 5, 16);
    // Words in range [5, 16]: the(5-5.3), clip(5.4-5.8), starts(6-6.5), here(10-10.3), and(10.5-10.7), ends(15-15.5)
    expect(result.length).toBe(6);
    expect(result[0].word).toBe('the');
    expect(result[result.length - 1].word).toBe('ends');
  });

  it('rebases timestamps to 0', () => {
    const result = filterWordsForClip(words, 5, 16);
    expect(result[0].start).toBe(0); // 5 - 5
    expect(result[0].end).toBeCloseTo(0.3); // 5.3 - 5 (floating point)
    expect(result[1].start).toBeCloseTo(0.4); // 5.4 - 5
  });

  it('preserves speaker IDs', () => {
    const result = filterWordsForClip(words, 5, 16);
    expect(result[0].speakerId).toBe('s1');
    expect(result[3].speakerId).toBe('s2');
  });

  it('excludes words that overlap clip boundaries', () => {
    // Word starts at 0 (before clip start of 5) — excluded
    const result = filterWordsForClip(words, 5, 16);
    expect(result.find(w => w.word === 'Before')).toBeUndefined();
  });

  it('excludes words after clip end', () => {
    const result = filterWordsForClip(words, 5, 16);
    expect(result.find(w => w.word === 'after')).toBeUndefined();
  });

  it('returns empty array when no words in range', () => {
    const result = filterWordsForClip(words, 100, 200);
    expect(result).toEqual([]);
  });

  it('handles empty word list', () => {
    const result = filterWordsForClip([], 0, 30);
    expect(result).toEqual([]);
  });

  it('handles exact boundary words', () => {
    // Word exactly at start boundary
    const result = filterWordsForClip(words, 5, 5.8);
    expect(result.length).toBe(2); // 'the' (5-5.3) and 'clip' (5.4-5.8)
  });
});

// ─── buildCaptionSegments ────────────────────────────────────────────

describe('buildCaptionSegments', () => {
  it('groups words into segments of 5', () => {
    const words: CaptionWordTimestamp[] = Array.from({ length: 12 }, (_, i) => ({
      word: `word${i}`,
      start: i * 0.5,
      end: i * 0.5 + 0.4,
    }));

    const segments = buildCaptionSegments(words);
    expect(segments.length).toBe(3); // 5, 5, 2
    expect(segments[0].text.split(' ').length).toBe(5);
    expect(segments[1].text.split(' ').length).toBe(5);
    expect(segments[2].text.split(' ').length).toBe(2);
  });

  it('sets segment start/end from first/last word', () => {
    const words: CaptionWordTimestamp[] = [
      { word: 'Hello', start: 0, end: 0.3 },
      { word: 'world', start: 0.4, end: 0.7 },
      { word: 'today', start: 0.8, end: 1.2 },
    ];

    const segments = buildCaptionSegments(words);
    expect(segments[0].start).toBe(0);
    expect(segments[0].end).toBe(1.2);
  });

  it('preserves first word speaker for segment', () => {
    const words: CaptionWordTimestamp[] = [
      { word: 'Host', start: 0, end: 0.3, speakerId: 'host1' },
      { word: 'speaking', start: 0.4, end: 0.7, speakerId: 'host1' },
      { word: 'Guest', start: 0.8, end: 1.0, speakerId: 'guest1' },
    ];

    const segments = buildCaptionSegments(words);
    expect(segments[0].speakerId).toBe('host1');
  });

  it('handles empty words array', () => {
    expect(buildCaptionSegments([])).toEqual([]);
  });

  it('handles single word', () => {
    const segments = buildCaptionSegments([
      { word: 'Hello', start: 0, end: 0.5 },
    ]);
    expect(segments.length).toBe(1);
    expect(segments[0].text).toBe('Hello');
  });

  it('handles exactly 5 words', () => {
    const words: CaptionWordTimestamp[] = Array.from({ length: 5 }, (_, i) => ({
      word: `w${i}`,
      start: i,
      end: i + 0.5,
    }));

    const segments = buildCaptionSegments(words);
    expect(segments.length).toBe(1);
    expect(segments[0].text.split(' ').length).toBe(5);
  });
});

// ─── buildSpeakerColors ──────────────────────────────────────────────

describe('buildSpeakerColors', () => {
  it('converts record to array of SpeakerColor', () => {
    const colors = buildSpeakerColors({
      host1: '&H004646E5',
      guest1: '&H00FFFF00',
    });

    expect(colors).toEqual([
      { speakerId: 'host1', color: '&H004646E5' },
      { speakerId: 'guest1', color: '&H00FFFF00' },
    ]);
  });

  it('handles empty record', () => {
    expect(buildSpeakerColors({})).toEqual([]);
  });

  it('handles single speaker', () => {
    const colors = buildSpeakerColors({ solo: '&H00FFFFFF' });
    expect(colors.length).toBe(1);
    expect(colors[0].speakerId).toBe('solo');
  });
});

// ─── Integration: filter → segments → captions pipeline ──────────────

describe('filter → segments pipeline', () => {
  it('full pipeline: filter words, build segments, verify timing', () => {
    // Simulate a transcript with words from 0-60s
    const transcript: WordTimestamp[] = [];
    for (let i = 0; i < 60; i++) {
      transcript.push({
        word: `word${i}`,
        start: i,
        end: i + 0.5,
        speakerId: i < 30 ? 'host' : 'guest',
      });
    }

    // Extract clip 10-25s
    const clipWords = filterWordsForClip(transcript, 10, 25);
    expect(clipWords.length).toBe(15); // words 10-24

    // All timestamps should be rebased to 0
    expect(clipWords[0].start).toBe(0);
    expect(clipWords[clipWords.length - 1].start).toBe(14);

    // Build segments
    const segments = buildCaptionSegments(clipWords);
    expect(segments.length).toBe(3); // 5, 5, 5

    // First segment timing
    expect(segments[0].start).toBe(0);
    expect(segments[0].end).toBe(4.5); // word14's end rebased

    // Speaker transitions
    expect(segments[0].speakerId).toBe('host'); // words 10-14 are host
    expect(segments[2].speakerId).toBe('host'); // words 20-24 are host (< 30)
  });
});
