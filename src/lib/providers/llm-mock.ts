// src/lib/providers/llm-mock.ts
//
// Mock LLM provider that returns fixture data instead of calling Anthropic.
// Activated when MOCK_AI=true or DEV_NO_EXTERNAL_APIS=true.
// Zero API cost. Deterministic responses for debugging.

import { z } from "zod";
import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from "./llm";
import { logMock } from "@/lib/dev-mode";
import {
  DEMO_CLIPS,
  DEMO_SPEAKERS,
  DEMO_SUMMARY,
  DEMO_LINKEDIN_POSTS,
  DEMO_X_THREADS,
  DEMO_NEWSLETTER_SECTIONS,
  DEMO_CHAPTER_MARKERS,
  DEMO_KEY_INSIGHTS,
  DEMO_NOTABLE_QUOTES,
} from "@/lib/fixtures/demo-job";

/**
 * Mock LLM provider — returns fixture-quality JSON responses.
 * Routes by detecting prompt content to return the right shape.
 */
export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const userMsg = messages.find((m) => m.role === "user")?.content ?? "";
    const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
    const combined = `${systemMsg} ${userMsg}`.toLowerCase();

    logMock("llm", `chat() called — detecting prompt type from ${messages.length} messages`);

    const content = this.routeResponse(combined);

    return {
      content,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  async chatStructured<T>(
    messages: LLMMessage[],
    schema: z.ZodSchema<T>,
    options?: LLMOptions,
  ): Promise<T> {
    const response = await this.chat(messages, options);
    const parsed: unknown = JSON.parse(response.content);
    return schema.parse(parsed);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private routeResponse(combined: string): string {
    // Speaker roles detection
    if (combined.includes("speaker") && combined.includes("role") && combined.includes("host")) {
      logMock("llm", "→ returning speaker roles fixture");
      return JSON.stringify({
        speakers: DEMO_SPEAKERS.map((s) => ({
          id: s.id,
          role: s.role === "host" ? "host" : "guest",
          confidence: 0.92,
          reasoning: `Mock: assigned ${s.role} based on fixture data`,
        })),
      });
    }

    // Clip analysis / detection
    if (combined.includes("clip") && (combined.includes("score") || combined.includes("detect") || combined.includes("candidate"))) {
      logMock("llm", "→ returning clip candidates fixture");
      return JSON.stringify({
        clips: DEMO_CLIPS.map((c) => ({
          startTime: c.startTime,
          endTime: c.endTime,
          duration: c.endTime - c.startTime,
          title: c.title,
          hook: c.hook,
          transcriptExcerpt: c.transcriptExcerpt,
          score: c.score,
          scoreFactors: c.scoreFactors,
          primarySpeakerId: c.primarySpeakerId,
          speakersPresent: c.speakersPresent,
          socialCaption: c.socialCaption,
          topics: c.hashtags,
        })),
      });
    }

    // Key insights
    if (combined.includes("insight") && !combined.includes("linkedin")) {
      logMock("llm", "→ returning key insights fixture");
      return JSON.stringify({ insights: DEMO_KEY_INSIGHTS });
    }

    // Notable quotes
    if (combined.includes("quote") && combined.includes("notable")) {
      logMock("llm", "→ returning notable quotes fixture");
      return JSON.stringify({ quotes: DEMO_NOTABLE_QUOTES });
    }

    // LinkedIn posts
    if (combined.includes("linkedin")) {
      logMock("llm", "→ returning LinkedIn posts fixture");
      return JSON.stringify({
        posts: DEMO_LINKEDIN_POSTS.map((p) => ({
          content: p.content,
          focusTopic: p.label.replace("LinkedIn Post: ", ""),
          wordCount: p.wordCount,
        })),
      });
    }

    // X threads
    if (combined.includes("thread") || combined.includes("twitter") || (combined.includes(" x ") && combined.includes("post"))) {
      logMock("llm", "→ returning X threads fixture");
      return JSON.stringify({
        threads: DEMO_X_THREADS.map((t) => ({
          focusTopic: t.focusTopic,
          threadPosts: t.posts,
          wordCount: t.wordCount,
        })),
      });
    }

    // Newsletter sections
    if (combined.includes("newsletter")) {
      logMock("llm", "→ returning newsletter sections fixture");
      return JSON.stringify({
        sections: DEMO_NEWSLETTER_SECTIONS.map((s) => ({
          sectionTitle: s.label.replace("Newsletter: ", ""),
          content: s.content,
          wordCount: s.wordCount,
        })),
      });
    }

    // Chapter markers
    if (combined.includes("chapter") && combined.includes("marker")) {
      logMock("llm", "→ returning chapter markers fixture");
      const chapters = DEMO_CHAPTER_MARKERS.split("\n").map((line) => {
        const [timestamp, ...titleParts] = line.split(" ");
        return { timestamp, title: titleParts.join(" ") };
      });
      return JSON.stringify({ chapters });
    }

    // Summary
    if (combined.includes("summary") || combined.includes("summarize")) {
      logMock("llm", "→ returning summary fixture");
      return JSON.stringify({
        summary: DEMO_SUMMARY.split("\n\nKey Insights:")[0],
        keyInsights: [
          "Create once, distribute everywhere",
          "Repurposing is translation, not duplication",
          "Automate the mechanical, keep the creative",
          "Start with 2 platforms max",
          "Batch scheduling prevents burnout",
        ],
        wordCount: DEMO_SUMMARY.split(/\s+/).length,
      });
    }

    // Text refinement (for /api/v1/texts/:id/refine)
    if (combined.includes("refine") || combined.includes("rewrite") || combined.includes("improve")) {
      logMock("llm", "→ returning text refinement fixture");
      return JSON.stringify({
        refinedText: "[Mock refined] The content has been refined for clarity and engagement while preserving the original voice and key message.",
        wordCount: 18,
        changesMade: "Mock refinement — no actual changes made. Set MOCK_AI=false for real AI refinement.",
      });
    }

    // Custom template fallback
    if (combined.includes("template") || combined.includes("custom")) {
      logMock("llm", "→ returning custom template fixture");
      return JSON.stringify({
        content: "This is mock output from a custom prompt template. In production, this would be generated by Claude based on your specific template instructions and the source content.",
        wordCount: 28,
      });
    }

    // Generic fallback
    logMock("llm", "→ no specific fixture matched, returning generic mock response");
    return JSON.stringify({
      content: "Mock LLM response. Set MOCK_AI=false and provide ANTHROPIC_API_KEY for real output.",
      wordCount: 14,
    });
  }
}
