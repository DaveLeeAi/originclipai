import { describe, it, expect } from "vitest";
import { clipAnalysisPrompt, clipAnalysisResponseSchema } from "@/prompts/clip-analysis";

describe("clipAnalysisPrompt", () => {
  it("builds a user message with all parameters", () => {
    const message = clipAnalysisPrompt.buildUserMessage({
      sourceTitle: "Test Podcast",
      duration: "45:00",
      contentType: "podcast interview",
      speakers: [
        { id: "S1", label: "Host", role: "host", talkTimePct: 35, talkTimeSeconds: 945 },
        { id: "S2", label: "Guest", role: "guest", talkTimePct: 65, talkTimeSeconds: 1755 },
      ],
      transcript: "Hello and welcome to the show...",
      minDuration: 30,
      maxDuration: 90,
      targetClips: 12,
    });

    expect(message).toContain("Test Podcast");
    expect(message).toContain("45:00");
    expect(message).toContain("podcast interview");
    expect(message).toContain("S1");
    expect(message).toContain("12");
    expect(message).toContain("30 seconds");
    expect(message).toContain("90 seconds");
  });

  it("has correct temperature for consistency", () => {
    expect(clipAnalysisPrompt.temperature).toBe(0.3);
  });

  it("validates a well-formed clip response", () => {
    const validResponse = [
      {
        startTime: 10.5,
        endTime: 55.2,
        duration: 44.7,
        title: "Why systems beat discipline",
        hook: "Here's the thing nobody tells you...",
        transcriptExcerpt: "Here's the thing nobody tells you about consistency...",
        score: 92,
        scoreFactors: {
          coherence: 95,
          hookStrength: 90,
          topicClarity: 92,
          emotionalEnergy: 88,
        },
        primarySpeakerId: "S2",
        speakersPresent: [{ id: "S2", talkPct: 100 }],
        topics: ["systems", "consistency"],
        socialCaption: "Stop relying on motivation.",
      },
    ];

    const result = clipAnalysisResponseSchema.parse(validResponse);
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(92);
  });

  it("rejects clips with score out of range", () => {
    const invalid = [
      {
        startTime: 0,
        endTime: 30,
        duration: 30,
        title: "Test",
        transcriptExcerpt: "Test excerpt here",
        score: 150, // invalid: > 100
        scoreFactors: {
          coherence: 50,
          hookStrength: 50,
          topicClarity: 50,
          emotionalEnergy: 50,
        },
        primarySpeakerId: "S1",
        speakersPresent: [{ id: "S1", talkPct: 100 }],
      },
    ];

    expect(() => clipAnalysisResponseSchema.parse(invalid)).toThrow();
  });

  it("rejects empty clip arrays", () => {
    expect(() => clipAnalysisResponseSchema.parse([])).toThrow();
  });

  it("parses response from raw LLM output", () => {
    const raw = JSON.stringify([
      {
        startTime: 120,
        endTime: 165,
        duration: 45,
        title: "The three pillars of content strategy",
        hook: "Most people get this wrong...",
        transcriptExcerpt: "Most people get this wrong when they think about content...",
        score: 88,
        scoreFactors: {
          coherence: 90,
          hookStrength: 85,
          topicClarity: 90,
          emotionalEnergy: 82,
        },
        primarySpeakerId: "S1",
        speakersPresent: [{ id: "S1", talkPct: 80 }, { id: "S2", talkPct: 20 }],
        topics: ["content strategy"],
        socialCaption: "Most people get content wrong.",
      },
    ]);

    const result = clipAnalysisPrompt.parseResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("The three pillars of content strategy");
  });
});
