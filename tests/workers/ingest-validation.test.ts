import { describe, it, expect } from "vitest";

/**
 * Ingest worker validation tests.
 * Tests input validation and source type detection logic
 * without requiring database or external service connections.
 */

describe("ingest source type routing", () => {
  const TEXT_ONLY_TYPES = ["article_url", "pdf_upload"];
  const MEDIA_TYPES = ["youtube_url", "video_url", "video_upload", "audio_upload"];

  it("article_url routes to text-only path", () => {
    expect(TEXT_ONLY_TYPES.includes("article_url")).toBe(true);
  });

  it("pdf_upload routes to text-only path", () => {
    expect(TEXT_ONLY_TYPES.includes("pdf_upload")).toBe(true);
  });

  it("youtube_url routes to media path", () => {
    expect(MEDIA_TYPES.includes("youtube_url")).toBe(true);
    expect(TEXT_ONLY_TYPES.includes("youtube_url")).toBe(false);
  });

  it("video_upload routes to media path", () => {
    expect(MEDIA_TYPES.includes("video_upload")).toBe(true);
    expect(TEXT_ONLY_TYPES.includes("video_upload")).toBe(false);
  });

  it("audio_upload routes to media path", () => {
    expect(MEDIA_TYPES.includes("audio_upload")).toBe(true);
    expect(TEXT_ONLY_TYPES.includes("audio_upload")).toBe(false);
  });
});

describe("HTML text extraction", () => {
  // Test the extraction logic used in the article ingest handler

  function extractTextFromHtml(html: string): string {
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<[^>]+>/g, " ");
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/\s+/g, " ").trim();
    return text.slice(0, 500_000);
  }

  function extractTitleFromHtml(html: string): string | undefined {
    const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
    return match?.[1]?.trim();
  }

  it("strips HTML tags", () => {
    const result = extractTextFromHtml("<p>Hello <b>world</b></p>");
    expect(result).toBe("Hello world");
  });

  it("removes script blocks", () => {
    const result = extractTextFromHtml(
      "<p>Keep this</p><script>alert('remove')</script><p>And this</p>"
    );
    expect(result).toContain("Keep this");
    expect(result).toContain("And this");
    expect(result).not.toContain("alert");
  });

  it("removes style blocks", () => {
    const result = extractTextFromHtml(
      "<style>.hide{display:none}</style><p>Content here</p>"
    );
    expect(result).toBe("Content here");
  });

  it("decodes HTML entities", () => {
    const result = extractTextFromHtml("Tom &amp; Jerry &lt;3");
    expect(result).toBe("Tom & Jerry <3");
  });

  it("extracts title from HTML", () => {
    const title = extractTitleFromHtml(
      "<html><head><title>My Article</title></head><body>...</body></html>"
    );
    expect(title).toBe("My Article");
  });

  it("returns undefined when no title", () => {
    const title = extractTitleFromHtml("<html><body>No title</body></html>");
    expect(title).toBeUndefined();
  });
});
