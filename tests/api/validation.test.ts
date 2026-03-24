import { describe, it, expect } from "vitest";
import { createJobSchema } from "@/lib/utils/validation";

describe("createJobSchema", () => {
  it("accepts valid YouTube URL", () => {
    const result = createJobSchema.safeParse({
      sourceType: "youtube_url",
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(result.success).toBe(true);
  });

  it("accepts YouTube Shorts URL", () => {
    const result = createJobSchema.safeParse({
      sourceType: "youtube_url",
      sourceUrl: "https://www.youtube.com/shorts/abc123-xyz",
    });
    expect(result.success).toBe(true);
  });

  it("accepts youtu.be short URL", () => {
    const result = createJobSchema.safeParse({
      sourceType: "youtube_url",
      sourceUrl: "https://youtu.be/dQw4w9WgXcQ",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid YouTube URL", () => {
    const result = createJobSchema.safeParse({
      sourceType: "youtube_url",
      sourceUrl: "https://example.com/watch?v=123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts video_url with any valid URL", () => {
    const result = createJobSchema.safeParse({
      sourceType: "video_url",
      sourceUrl: "https://cdn.example.com/video.mp4",
    });
    expect(result.success).toBe(true);
  });

  it("accepts video_upload with file key", () => {
    const result = createJobSchema.safeParse({
      sourceType: "video_upload",
      sourceFileKey: "uploads/user123/video.mp4",
    });
    expect(result.success).toBe(true);
  });

  it("accepts audio_upload with file key", () => {
    const result = createJobSchema.safeParse({
      sourceType: "audio_upload",
      sourceFileKey: "uploads/user123/podcast.mp3",
    });
    expect(result.success).toBe(true);
  });

  it("accepts article_url", () => {
    const result = createJobSchema.safeParse({
      sourceType: "article_url",
      sourceUrl: "https://blog.example.com/some-article",
    });
    expect(result.success).toBe(true);
  });

  it("accepts pdf_upload", () => {
    const result = createJobSchema.safeParse({
      sourceType: "pdf_upload",
      sourceFileKey: "uploads/user123/document.pdf",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown source type", () => {
    const result = createJobSchema.safeParse({
      sourceType: "instagram_reel",
      sourceUrl: "https://instagram.com/reel/123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects youtube_url without sourceUrl", () => {
    const result = createJobSchema.safeParse({
      sourceType: "youtube_url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects video_upload without sourceFileKey", () => {
    const result = createJobSchema.safeParse({
      sourceType: "video_upload",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty file key", () => {
    const result = createJobSchema.safeParse({
      sourceType: "video_upload",
      sourceFileKey: "",
    });
    expect(result.success).toBe(false);
  });
});
