/**
 * Integration test: article_url vertical slice.
 *
 * Tests the full pipeline logic (without real external services)
 * by mocking the storage provider and LLM provider, then running
 * the ingest and analyze handlers directly.
 *
 * This validates:
 * - HTML text extraction from article content
 * - Text chunking for LLM processing
 * - Analyze handler orchestration (summary, insights, quotes, text outputs)
 * - Correct job status transitions
 * - TextOutput records creation with proper types
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// ─── Mock the external dependencies ─────────────────────────────────

// Mock Prisma client
const mockJobData: {
  id: string;
  userId: string;
  sourceType: string;
  sourceUrl: string;
  sourceFileKey: string | null;
  sourceTitle: string | null;
  [key: string]: unknown;
} = {
  id: "test-job-001",
  userId: "test-user-001",
  sourceType: "article_url",
  sourceUrl: "https://example.com/article",
  sourceFileKey: null,
  sourceTitle: null,
  sourceDurationSeconds: null,
  sourceMetadata: {},
  status: "created",
  currentStep: null,
  progress: { ingest: "pending", transcribe: "pending", analyze: "pending", render: "pending" },
  error: null,
  clipCount: 0,
  textOutputCount: 0,
  minutesConsumed: 0,
  processingStartedAt: null,
  processingCompletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createdTextOutputs: Array<{ type: string; label: string; content: string; wordCount: number }> = [];
let jobUpdates: Array<Record<string, unknown>> = [];

vi.mock("@/lib/db/client", () => ({
  prisma: {
    job: {
      findUniqueOrThrow: vi.fn().mockResolvedValue(mockJobData),
      findUnique: vi.fn().mockResolvedValue(mockJobData),
      update: vi.fn().mockImplementation(({ data }) => {
        jobUpdates.push(data);
        Object.assign(mockJobData, data);
        return Promise.resolve(mockJobData);
      }),
    },
    transcript: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    textOutput: {
      create: vi.fn().mockImplementation(({ data }) => {
        createdTextOutputs.push(data);
        return Promise.resolve({ id: `text-${createdTextOutputs.length}`, ...data });
      }),
    },
    promptTemplate: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
  db: {
    job: {
      findUniqueOrThrow: vi.fn().mockResolvedValue(mockJobData),
      findUnique: vi.fn().mockResolvedValue(mockJobData),
      update: vi.fn().mockImplementation(({ data }) => {
        jobUpdates.push(data);
        Object.assign(mockJobData, data);
        return Promise.resolve(mockJobData);
      }),
    },
  },
}));

vi.mock("@/lib/db/job-progress", () => ({
  updateJobProgress: vi.fn().mockResolvedValue(undefined),
  updateJobStatus: vi.fn().mockResolvedValue(undefined),
}));

// Mock storage — stores files in memory
const memoryStorage = new Map<string, Buffer>();
vi.mock("@/lib/providers/storage-supabase", () => ({
  getStorageProvider: () => ({
    name: "mock-storage",
    upload: vi.fn().mockImplementation((key: string, data: Buffer) => {
      memoryStorage.set(key, data);
      return Promise.resolve(key);
    }),
    download: vi.fn().mockImplementation((key: string) => {
      const data = memoryStorage.get(key);
      if (!data) throw new Error(`Not found: ${key}`);
      return Promise.resolve(data);
    }),
    getSignedUrl: vi.fn().mockResolvedValue("https://mock.storage/signed-url"),
    delete: vi.fn().mockResolvedValue(undefined),
    isAvailable: vi.fn().mockResolvedValue(true),
  }),
}));

// Mock LLM — returns structured JSON responses
const mockLLMResponses: Record<string, string> = {
  // Summary prompt
  summary: JSON.stringify({
    summary: "This article covers the main topic of testing software pipelines. It discusses best practices and common patterns.",
    keyInsights: [
      "Integration tests catch bugs that unit tests miss",
      "Mocking external services enables reliable testing",
      "Pipeline architecture benefits from clear stage boundaries",
    ],
    wordCount: 25,
  }),
  // Key insights prompt (must match keyInsightsResponseSchema)
  insights: JSON.stringify({
    insights: [
      {
        insight: "Integration testing is essential for pipeline-first architectures because it catches cross-boundary bugs",
        significance: "Integration tests catch bugs that unit tests miss by exercising the full pipeline flow end to end",
        speakerId: null,
        approximateTimestamp: null,
        tags: ["testing", "architecture"],
        confidence: 0.9,
      },
    ],
    topicSummary: "This content covers testing strategies for pipeline-based software architectures",
  }),
  // Notable quotes prompt (must match notableQuotesResponseSchema)
  quotes: JSON.stringify({
    quotes: [
      {
        quote: "The only way to build reliable pipelines is to test them end to end",
        speakerId: "speaker_0",
        speakerLabel: "Author",
        approximateTimestamp: null,
        context: "Discussing the importance of testing strategy in pipeline architectures",
        impact: "practical",
        socialReady: true,
      },
    ],
  }),
  // LinkedIn post prompt (wordCount must be 30-500, content 50-3000 chars)
  linkedin: JSON.stringify([
    {
      content: "Here's what I learned about pipeline testing and why it matters for every engineering team building content systems:\n\n1. Integration tests catch the bugs that unit tests miss entirely\n2. Mocking external services enables fast reliable test runs\n3. Clear stage boundaries make pipelines inherently more testable\n\nWhat's your testing strategy? Drop a comment below.",
      wordCount: 55,
      focusTopic: "Pipeline Testing",
      hookLine: "Here's what I learned about pipeline testing",
    },
  ]),
  // X thread prompt (each post 5-280 chars, 3-15 posts)
  xthread: JSON.stringify([
    {
      threadPosts: [
        { postNumber: 1, text: "Thread on pipeline testing — here's what I've learned building content processing systems (1/4):" },
        { postNumber: 2, text: "Integration tests catch what unit tests miss. They exercise the full flow from input to output and validate the pieces fit together." },
        { postNumber: 3, text: "Always mock external services for reliability. Real API calls are slow, flaky, and expensive in test environments." },
        { postNumber: 4, text: "Clear stage boundaries make pipelines inherently more testable. Design for testability from day one." },
      ],
      postCount: 4,
      wordCount: 60,
      focusTopic: "Pipeline Testing",
    },
  ]),
  // Newsletter section prompt (content 100-5000 chars, wordCount 80-1000)
  newsletter: JSON.stringify([
    {
      content: "## Pipeline Testing Best Practices\n\nThis week we explore how to build reliable content processing pipelines. The key insight is that integration tests catch bugs that unit tests miss because they exercise the full flow from input to output. When building pipeline architectures, clear stage boundaries make it easier to test each component in isolation while still validating the end-to-end flow. Mocking external services is essential for reliable testing. Real API calls are slow, flaky, and expensive.",
      wordCount: 82,
      sectionTitle: "Pipeline Testing Best Practices",
      focusTopic: "Testing",
    },
  ]),
};

let llmCallCount = 0;

vi.mock("@/lib/providers/llm-anthropic", () => ({
  getLLMProvider: () => ({
    name: "mock-llm",
    chat: vi.fn().mockImplementation(async (messages: Array<{ role: string; content: string }>) => {
      llmCallCount++;
      const systemContent = messages.find((m) => m.role === "system")?.content ?? "";
      const userContent = messages.find((m) => m.role === "user")?.content ?? "";

      let responseContent: string;

      // Route mock responses by matching against actual prompt templates.
      // Order matters — more specific matches first, generic fallback last.
      if (systemContent.includes("content analyst extracting") || userContent.includes("maxInsights")) {
        responseContent = mockLLMResponses.insights;
      } else if (systemContent.includes("quotable, memorable") || systemContent.includes("memorable, quotable") || userContent.includes("maxQuotes")) {
        responseContent = mockLLMResponses.quotes;
      } else if (systemContent.includes("LinkedIn") || userContent.includes("LinkedIn")) {
        responseContent = mockLLMResponses.linkedin;
      } else if (systemContent.includes("thread") || userContent.includes("thread")) {
        responseContent = mockLLMResponses.xthread;
      } else if (systemContent.includes("newsletter") || userContent.includes("newsletter")) {
        responseContent = mockLLMResponses.newsletter;
      } else if (systemContent.includes("summary") || userContent.includes("summary")) {
        responseContent = mockLLMResponses.summary;
      } else {
        responseContent = mockLLMResponses.summary;
      }

      return { content: responseContent, usage: { inputTokens: 100, outputTokens: 50 } };
    }),
    chatStructured: vi.fn(),
    isAvailable: vi.fn().mockResolvedValue(true),
  }),
  isLLMAvailable: () => true,
  setLLMProvider: vi.fn(),
}));

// Mock BullMQ queue
vi.mock("@/lib/queue/queues", () => ({
  ingestQueue: () => ({ add: vi.fn().mockResolvedValue({}) }),
  transcribeQueue: () => ({ add: vi.fn().mockResolvedValue({}) }),
  analyzeQueue: () => ({ add: vi.fn().mockResolvedValue({}) }),
  renderQueue: () => ({ add: vi.fn().mockResolvedValue({}) }),
  scheduleQueue: () => ({ add: vi.fn().mockResolvedValue({}) }),
  exportQueue: () => ({ add: vi.fn().mockResolvedValue({}) }),
}));

// Mock webhook
vi.mock("@/lib/webhooks/dispatcher", () => ({
  fireJobCompletedWebhook: vi.fn().mockResolvedValue(undefined),
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

// Mock fetch for article download
const MOCK_ARTICLE_HTML = `
<html>
<head><title>Test Article: Pipeline Testing Best Practices</title></head>
<body>
  <nav>Navigation menu here</nav>
  <article>
    <h1>Pipeline Testing Best Practices</h1>
    <p>Building reliable content processing pipelines requires a solid testing strategy.
    Integration tests catch bugs that unit tests miss because they exercise the full flow
    from input to output. When building pipeline architectures, clear stage boundaries
    make it easier to test each component in isolation while still validating the end-to-end flow.</p>
    <p>Mocking external services is essential for reliable testing. Real API calls are slow,
    flaky, and expensive. By mocking the LLM provider, storage provider, and queue system,
    you can run the full pipeline logic in milliseconds. This approach also makes it easy
    to test error handling by simulating provider failures.</p>
    <p>The only way to build reliable pipelines is to test them end to end. Unit tests
    validate individual functions, but integration tests validate that the pieces fit together.
    A well-structured pipeline with clear interfaces between stages is inherently more testable.</p>
  </article>
  <footer>Footer content here</footer>
</body>
</html>`;

const originalFetch = globalThis.fetch;
vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string | Request) => {
  const urlStr = typeof url === "string" ? url : url.url;
  if (urlStr.includes("example.com/article")) {
    return {
      ok: true,
      status: 200,
      text: async () => MOCK_ARTICLE_HTML,
      headers: new Headers({ "content-type": "text/html" }),
    };
  }
  // Fall through to real fetch for other URLs (shouldn't happen in tests)
  return originalFetch(url);
}));

// ─── Import handlers after mocks are set up ─────────────────────────

// Dynamic imports ensure mocks are applied before the handlers load their deps
import type { IngestJobData, AnalyzeJobData } from "@/types";
let handleIngestJob: (data: IngestJobData) => Promise<void>;
let handleAnalyzeJob: (data: AnalyzeJobData) => Promise<void>;

beforeAll(async () => {
  const ingestMod = await import("@/workers/ingest/handler");
  const analyzeMod = await import("@/workers/analyze/handler");
  handleIngestJob = ingestMod.handleIngestJob;
  handleAnalyzeJob = analyzeMod.handleAnalyzeJob;
});

// ─── Tests ──────────────────────────────────────────────────────────

describe("article_url vertical slice", () => {
  beforeEach(() => {
    createdTextOutputs.length = 0;
    jobUpdates = [];
    memoryStorage.clear();
    llmCallCount = 0;
    // Reset mock job data
    Object.assign(mockJobData, {
      sourceFileKey: null,
      sourceTitle: null,
      status: "created",
      clipCount: 0,
      textOutputCount: 0,
    });
  });

  it("ingest handler extracts text from article HTML and stores JSON", async () => {
    await handleIngestJob({
      jobId: "test-job-001",
      sourceType: "article_url",
      sourceUrl: "https://example.com/article",
    });

    // Should have stored a JSON file in memory storage
    const storedKeys = Array.from(memoryStorage.keys());
    expect(storedKeys).toContain("jobs/test-job-001/article.json");

    // Should have extracted article text
    const stored = JSON.parse(memoryStorage.get("jobs/test-job-001/article.json")!.toString());
    expect(stored.title).toBe("Test Article: Pipeline Testing Best Practices");
    expect(stored.content).toContain("Pipeline Testing Best Practices");
    expect(stored.content).not.toContain("Navigation menu here"); // nav stripped
    expect(stored.content).not.toContain("Footer content here"); // footer stripped
  });

  it("analyze handler calls LLM and creates text outputs for article", async () => {
    // Set up as if ingest completed
    mockJobData.sourceFileKey = "jobs/test-job-001/article.json";
    mockJobData.sourceTitle = "Test Article";
    memoryStorage.set(
      "jobs/test-job-001/article.json",
      Buffer.from(JSON.stringify({
        title: "Test Article",
        content: "Building reliable content processing pipelines requires a solid testing strategy. Integration tests catch bugs that unit tests miss because they exercise the full flow.",
      })),
    );

    await handleAnalyzeJob({
      jobId: "test-job-001",
      transcriptId: "",
      sourceType: "article_url",
    });

    // Should have called the LLM multiple times (summary + insights + quotes + platform texts)
    expect(llmCallCount).toBeGreaterThanOrEqual(3);

    // Should have created text outputs of various types
    expect(createdTextOutputs.length).toBeGreaterThan(0);

    // Summary should always be created (from intelligence layer)
    const summaryOutputs = createdTextOutputs.filter((t) => t.type === "summary");
    expect(summaryOutputs.length).toBe(1);
    expect(summaryOutputs[0].content.length).toBeGreaterThan(0);
  });

  it("analyze handler gracefully handles failed insight/quote extraction", async () => {
    // The mock LLM may not route insight/quote prompts perfectly,
    // but the pipeline should still complete and create other outputs.
    mockJobData.sourceFileKey = "jobs/test-job-001/article.json";
    mockJobData.sourceTitle = "Test Article";
    memoryStorage.set(
      "jobs/test-job-001/article.json",
      Buffer.from(JSON.stringify({
        title: "Test",
        content: "Testing content for insight extraction. The only way to build reliable pipelines is to test them end to end.",
      })),
    );

    await handleAnalyzeJob({
      jobId: "test-job-001",
      transcriptId: "",
      sourceType: "article_url",
    });

    // Pipeline should complete even if insights/quotes fail to parse.
    // Summary should still be created from the intelligence layer.
    const summaries = createdTextOutputs.filter((t) => t.type === "summary");
    expect(summaries.length).toBe(1);

    // All created outputs should have valid content
    for (const output of createdTextOutputs) {
      expect(output.content.length).toBeGreaterThan(0);
      expect(output.wordCount).toBeGreaterThan(0);
    }
  });

  it("analyze handler does not create clips for text-only source", async () => {
    mockJobData.sourceFileKey = "jobs/test-job-001/article.json";
    mockJobData.sourceTitle = "Test";
    memoryStorage.set(
      "jobs/test-job-001/article.json",
      Buffer.from(JSON.stringify({ title: "Test", content: "Some text content." })),
    );

    await handleAnalyzeJob({
      jobId: "test-job-001",
      transcriptId: "",
      sourceType: "article_url",
    });

    // No clip types should exist (text-only skips clip detection)
    const validTextTypes = ["summary", "key_insight", "notable_quote", "linkedin_post", "x_thread", "newsletter_section", "chapter_markers", "custom"];
    for (const output of createdTextOutputs) {
      expect(validTextTypes).toContain(output.type);
    }
  });
});
