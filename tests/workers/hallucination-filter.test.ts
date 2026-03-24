import { describe, it, expect } from "vitest";
import { filterHallucinations } from "@/workers/transcribe/hallucination-filter";
import type { TranscriptSegment, WordTimestamp } from "@/types";

function makeSegment(
  start: number,
  end: number,
  text: string,
  speakerId = "S1",
): TranscriptSegment {
  return { start, end, text, speakerId, confidence: 0.9 };
}

function makeWord(
  word: string,
  start: number,
  end: number,
  speakerId = "S1",
): WordTimestamp {
  return { word, start, end, speakerId };
}

describe("filterHallucinations", () => {
  it("passes through normal segments", () => {
    const segments = [
      makeSegment(0, 5, "Today we're going to talk about productivity."),
      makeSegment(5, 10, "The key insight is consistency."),
    ];
    const words = [
      makeWord("Today", 0, 0.5),
      makeWord("we're", 0.5, 1),
    ];

    const result = filterHallucinations(segments, words);
    expect(result.segments).toHaveLength(2);
    expect(result.removedCount).toBe(0);
  });

  it("removes 'Thank you for watching' hallucination", () => {
    const segments = [
      makeSegment(0, 5, "Real content here."),
      makeSegment(5, 8, "Thank you for watching"),
      makeSegment(8, 13, "More real content."),
    ];

    const result = filterHallucinations(segments, []);
    expect(result.segments).toHaveLength(2);
    expect(result.removedCount).toBe(1);
    expect(result.segments.map((s) => s.text)).not.toContain(
      "Thank you for watching",
    );
  });

  it("removes 'Please subscribe' hallucination", () => {
    const segments = [
      makeSegment(0, 5, "Real content."),
      makeSegment(5, 8, "Please like and subscribe"),
    ];

    const result = filterHallucinations(segments, []);
    expect(result.segments).toHaveLength(1);
    expect(result.removedCount).toBe(1);
  });

  it("removes 'Subscribe' standalone hallucination", () => {
    const segments = [
      makeSegment(0, 5, "Real content."),
      makeSegment(5, 7, "Subscribe"),
    ];

    const result = filterHallucinations(segments, []);
    expect(result.segments).toHaveLength(1);
    expect(result.removedCount).toBe(1);
  });

  it("removes repeated phrases (3 in a row)", () => {
    const segments = [
      makeSegment(0, 5, "Real intro content."),
      makeSegment(5, 10, "This phrase repeats."),
      makeSegment(10, 15, "This phrase repeats."),
      makeSegment(15, 20, "This phrase repeats."),
      makeSegment(20, 25, "Real content continues."),
    ];

    const result = filterHallucinations(segments, []);
    // Third repeat (index 3) should be caught as repeated
    expect(result.removedCount).toBe(1);
    expect(result.segments.length).toBe(4);
  });

  it("removes empty segments", () => {
    const segments = [
      makeSegment(0, 5, "Real content."),
      makeSegment(5, 8, "   "),
      makeSegment(8, 13, "More content."),
    ];

    const result = filterHallucinations(segments, []);
    expect(result.segments).toHaveLength(2);
    expect(result.removedCount).toBe(1);
  });

  it("filters word timestamps to match kept segments", () => {
    const segments = [
      makeSegment(0, 5, "Keep this."),
      makeSegment(5, 8, "Thank you for watching"),
      makeSegment(8, 13, "And this."),
    ];
    const words = [
      makeWord("Keep", 0, 1),
      makeWord("this.", 1, 2),
      makeWord("Thank", 5, 5.5),
      makeWord("you", 5.5, 6),
      makeWord("And", 8, 9),
      makeWord("this.", 9, 10),
    ];

    const result = filterHallucinations(segments, words);
    expect(result.wordTimestamps).toHaveLength(4);
    expect(result.wordTimestamps.map((w) => w.word)).toEqual([
      "Keep",
      "this.",
      "And",
      "this.",
    ]);
  });

  it("rebuilds fullText from remaining segments", () => {
    const segments = [
      makeSegment(0, 5, "First part."),
      makeSegment(5, 8, "Thanks for watching"),
      makeSegment(8, 13, "Second part."),
    ];

    const result = filterHallucinations(segments, []);
    expect(result.fullText).toBe("First part. Second part.");
  });
});
