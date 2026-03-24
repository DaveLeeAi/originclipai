import type { TranscriptSegment, WordTimestamp } from "@/types";

/**
 * Known Whisper hallucination phrases.
 * These appear in silent or low-audio gaps as phantom speech.
 */
const HALLUCINATION_PATTERNS = [
  /^thank(s| you)?\s*(for)?\s*(watching|listening)/i,
  /^please\s*(like\s*(and)?|subscribe)/i,
  /^(like\s*and\s*)?subscribe/i,
  /^(don't forget to\s*)?(hit the|smash that)\s*(like|bell|subscribe)/i,
  /^see you\s*(in the)?\s*next\s*(one|video|episode)/i,
  /^bye[\s!.]*$/i,
  /^\s*$/,
];

/**
 * Detect repeated phrases that indicate hallucination.
 * Whisper sometimes loops the same phrase in silence gaps.
 */
function isRepeatedPhrase(
  segment: TranscriptSegment,
  allSegments: TranscriptSegment[],
  index: number,
): boolean {
  const text = segment.text.trim().toLowerCase();
  if (text.length < 5) return false;

  // Check if the same text appears in the previous 3 segments
  let repeatCount = 0;
  for (let i = Math.max(0, index - 3); i < index; i++) {
    if (allSegments[i].text.trim().toLowerCase() === text) {
      repeatCount++;
    }
  }
  return repeatCount >= 2;
}

/**
 * Filter out hallucinated segments from Whisper output.
 * Returns cleaned segments and word timestamps.
 */
export function filterHallucinations(
  segments: TranscriptSegment[],
  wordTimestamps: WordTimestamp[],
): {
  segments: TranscriptSegment[];
  wordTimestamps: WordTimestamp[];
  fullText: string;
  removedCount: number;
} {
  let removedCount = 0;
  const filteredSegments: TranscriptSegment[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const text = segment.text.trim();

    // Check against known hallucination patterns
    const isHallucination = HALLUCINATION_PATTERNS.some((pattern) =>
      pattern.test(text),
    );

    // Check for repeated phrases
    const isRepeat = isRepeatedPhrase(segment, segments, i);

    if (isHallucination || isRepeat) {
      removedCount++;
      continue;
    }

    filteredSegments.push(segment);
  }

  // Filter word timestamps to only include words from kept segments
  const keptTimeRanges = filteredSegments.map((s) => ({
    start: s.start,
    end: s.end,
  }));

  const filteredWords = wordTimestamps.filter((w) =>
    keptTimeRanges.some((range) => w.start >= range.start && w.end <= range.end),
  );

  const fullText = filteredSegments.map((s) => s.text.trim()).join(" ");

  return {
    segments: filteredSegments,
    wordTimestamps: filteredWords,
    fullText,
    removedCount,
  };
}
