import { prisma } from "@/lib/db/client";
import { updateJobProgress, updateJobStatus } from "@/lib/db/job-progress";
import { transcribeQueue } from "@/lib/queue/queues";
import { getStorageProvider } from "@/lib/providers/storage-supabase";
import type { IngestJobData, SourceType } from "@/types";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";


const execAsync = promisify(exec);

/** Maximum file size: 2GB */
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

/**
 * Ingest handler — downloads source content, extracts metadata, stores in object storage.
 * Delegates to source-specific download functions based on sourceType.
 */
export async function handleIngestJob(data: IngestJobData): Promise<void> {
  const { jobId, sourceType, sourceUrl, sourceFileKey } = data;

  try {
    await updateJobStatus(jobId, "ingesting");
    await updateJobProgress(jobId, "ingest", "running");

    // Idempotency check: if job already has a sourceFileKey, skip download
    const existingJob = await prisma.job.findUniqueOrThrow({
      where: { id: jobId },
    });
    if (existingJob.sourceFileKey && existingJob.status !== "ingesting") {
      await enqueueNextStep(jobId, sourceType, existingJob.sourceFileKey);
      return;
    }

    let resultKey: string;
    let metadata: SourceMetadata;

    switch (sourceType) {
      case "youtube_url": {
        if (!sourceUrl) throw new PermanentError("sourceUrl is required for youtube_url");
        const result = await downloadYouTube(jobId, sourceUrl);
        resultKey = result.storageKey;
        metadata = result.metadata;
        break;
      }
      case "video_url": {
        if (!sourceUrl) throw new PermanentError("sourceUrl is required for video_url");
        const result = await downloadVideoUrl(jobId, sourceUrl);
        resultKey = result.storageKey;
        metadata = result.metadata;
        break;
      }
      case "audio_upload":
      case "video_upload": {
        if (!sourceFileKey) throw new PermanentError("sourceFileKey is required for uploads");
        const result = await processUpload(jobId, sourceFileKey, sourceType);
        resultKey = result.storageKey;
        metadata = result.metadata;
        break;
      }
      case "article_url": {
        if (!sourceUrl) throw new PermanentError("sourceUrl is required for article_url");
        const result = await extractArticle(jobId, sourceUrl);
        resultKey = result.storageKey;
        metadata = result.metadata;
        break;
      }
      case "pdf_upload": {
        if (!sourceFileKey) throw new PermanentError("sourceFileKey is required for pdf_upload");
        const result = await extractPdf(jobId, sourceFileKey);
        resultKey = result.storageKey;
        metadata = result.metadata;
        break;
      }
      default:
        throw new PermanentError(`Unsupported source type: ${sourceType}`);
    }

    // Update job with metadata
    await prisma.job.update({
      where: { id: jobId },
      data: {
        sourceFileKey: resultKey,
        sourceTitle: metadata.title ?? null,
        sourceDurationSeconds: metadata.durationSeconds ?? null,
        sourceMetadata: JSON.parse(JSON.stringify(metadata)),
      },
    });

    await updateJobProgress(jobId, "ingest", "complete");

    // Enqueue the next pipeline step
    await enqueueNextStep(jobId, sourceType, resultKey);
  } catch (error) {
    if (error instanceof PermanentError) {
      // Permanent failure — mark failed, do not retry
      await updateJobProgress(jobId, "ingest", "error").catch(() => {});
      await updateJobStatus(jobId, "failed", error.message).catch(() => {});
      return; // Return without throwing — BullMQ won't retry
    }

    // Transient failure — let BullMQ retry
    await updateJobProgress(jobId, "ingest", "error").catch(() => {});
    await updateJobStatus(
      jobId,
      "failed",
      error instanceof Error ? error.message : "Unknown ingest error",
    ).catch(() => {});
    throw error;
  }
}

// ─── Source-specific download functions ──────────────────────────────

interface IngestResult {
  storageKey: string;
  metadata: SourceMetadata;
}

interface SourceMetadata {
  title?: string;
  durationSeconds?: number;
  description?: string;
  thumbnail?: string;
  author?: string;
  [key: string]: unknown;
}

async function downloadYouTube(
  jobId: string,
  url: string,
): Promise<IngestResult> {
  const tempDir = path.join(os.tmpdir(), `ingest-${jobId}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Extract metadata first using yt-dlp JSON dump
    const { stdout: metaJson } = await execAsync(
      `yt-dlp --dump-json --no-download "${url}"`,
      { maxBuffer: 10 * 1024 * 1024 },
    );
    const meta = JSON.parse(metaJson) as {
      title?: string;
      duration?: number;
      description?: string;
      thumbnail?: string;
      uploader?: string;
    };

    const outputPath = path.join(tempDir, "source.mp4");

    // Download best quality ≤ 1080p
    await execAsync(
      `yt-dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" --merge-output-format mp4 -o "${outputPath}" "${url}"`,
      { maxBuffer: 10 * 1024 * 1024, timeout: 600_000 },
    );

    // Check file size
    const stat = await fs.stat(outputPath);
    if (stat.size > MAX_FILE_SIZE) {
      throw new PermanentError("Video file exceeds 2GB size limit");
    }

    // Upload to storage
    const storage = getStorageProvider();
    const storageKey = `jobs/${jobId}/source.mp4`;
    const fileBuffer = await fs.readFile(outputPath);
    await storage.upload(storageKey, fileBuffer, {
      contentType: "video/mp4",
    });

    return {
      storageKey,
      metadata: {
        title: meta.title,
        durationSeconds: meta.duration,
        description: meta.description?.slice(0, 2000),
        thumbnail: meta.thumbnail,
        author: meta.uploader,
      },
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function downloadVideoUrl(
  jobId: string,
  url: string,
): Promise<IngestResult> {
  const tempDir = path.join(os.tmpdir(), `ingest-${jobId}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new PermanentError(`Failed to download video: HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "video/mp4";
    const ext = contentType.includes("webm") ? "webm" : "mp4";
    const outputPath = path.join(tempDir, `source.${ext}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      throw new PermanentError("Video file exceeds 2GB size limit");
    }

    await fs.writeFile(outputPath, buffer);

    // Extract duration via FFprobe
    let durationSeconds: number | undefined;
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of csv=p=0 "${outputPath}"`,
      );
      durationSeconds = parseFloat(stdout.trim()) || undefined;
    } catch {
      // FFprobe not available or failed — continue without duration
    }

    // Upload to storage
    const storage = getStorageProvider();
    const storageKey = `jobs/${jobId}/source.${ext}`;
    await storage.upload(storageKey, buffer, { contentType });

    return {
      storageKey,
      metadata: {
        title: new URL(url).pathname.split("/").pop() ?? "video",
        durationSeconds,
      },
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function processUpload(
  jobId: string,
  fileKey: string,
  sourceType: SourceType,
): Promise<IngestResult> {
  // File is already in storage — just extract metadata
  const storage = getStorageProvider();
  const tempDir = path.join(os.tmpdir(), `ingest-${jobId}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    const buffer = await storage.download(fileKey);
    const ext = sourceType === "audio_upload" ? "audio" : "video";
    const tempPath = path.join(tempDir, `source.${ext}`);
    await fs.writeFile(tempPath, buffer);

    let durationSeconds: number | undefined;
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of csv=p=0 "${tempPath}"`,
      );
      durationSeconds = parseFloat(stdout.trim()) || undefined;
    } catch {
      // FFprobe not available
    }

    return {
      storageKey: fileKey,
      metadata: {
        title: fileKey.split("/").pop() ?? "upload",
        durationSeconds,
      },
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function extractArticle(
  jobId: string,
  url: string,
): Promise<IngestResult> {
  // Fetch article content via simple HTTP — no Puppeteer in v1 for simplicity
  const response = await fetch(url);
  if (!response.ok) {
    throw new PermanentError(`Failed to fetch article: HTTP ${response.status}`);
  }

  const html = await response.text();

  // Basic article text extraction: strip tags, get meaningful content
  const textContent = extractTextFromHtml(html);
  const title = extractTitleFromHtml(html) ?? new URL(url).hostname;

  const contentJson = JSON.stringify({
    title,
    url,
    content: textContent,
    fetchedAt: new Date().toISOString(),
  });

  const storage = getStorageProvider();
  const storageKey = `jobs/${jobId}/article.json`;
  await storage.upload(storageKey, Buffer.from(contentJson), {
    contentType: "application/json",
  });

  return {
    storageKey,
    metadata: {
      title,
      sourceFormat: "article",
    },
  };
}

async function extractPdf(
  jobId: string,
  fileKey: string,
): Promise<IngestResult> {
  const storage = getStorageProvider();
  const buffer = await storage.download(fileKey);

  // Extract text using pdf-parse
  let textContent: string;
  let pageCount: number | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
    const parsed = await pdfParse(buffer);
    textContent = parsed.text;
    pageCount = parsed.numpages;
  } catch {
    // Fallback: basic UTF-8 extraction if pdf-parse fails (e.g. scanned PDFs)
    textContent = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
  }

  const title = fileKey.split("/").pop()?.replace(".pdf", "") ?? "document";

  const contentJson = JSON.stringify({
    title,
    content: textContent.slice(0, 500_000), // Cap at 500K chars
    fileKey,
    pageCount,
    fetchedAt: new Date().toISOString(),
  });

  const outputKey = `jobs/${jobId}/document.json`;
  await storage.upload(outputKey, Buffer.from(contentJson), {
    contentType: "application/json",
  });

  return {
    storageKey: outputKey,
    metadata: {
      title,
      sourceFormat: "pdf",
      pageCount,
    },
  };
}

// ─── HTML helpers ───────────────────────────────────────────────────

function extractTextFromHtml(html: string): string {
  // Try to extract from <article> or <main> for cleaner content
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const contentHtml = articleMatch?.[1] ?? mainMatch?.[1] ?? html;

  // Remove script and style blocks
  let text = contentHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  // Remove navigation, header, footer blocks
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
  // Remove all tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");
  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text.slice(0, 500_000); // Cap at 500K chars
}

function extractTitleFromHtml(html: string): string | undefined {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return match?.[1]?.trim();
}

// ─── Next step routing ──────────────────────────────────────────────

const TEXT_ONLY_TYPES: SourceType[] = ["article_url", "pdf_upload"];

async function enqueueNextStep(
  jobId: string,
  sourceType: SourceType,
  sourceFileKey: string,
): Promise<void> {
  if (TEXT_ONLY_TYPES.includes(sourceType)) {
    // Text-only path: skip transcribing, go to analyzing
    await updateJobStatus(jobId, "analyzing");
    const { analyzeQueue } = await import("@/lib/queue/queues");
    await analyzeQueue().add("analyze", {
      jobId,
      transcriptId: "", // No transcript for text-only
      sourceType,
    });
  } else {
    // Video/audio path: go to transcribing
    await updateJobStatus(jobId, "transcribing");
    await transcribeQueue().add("transcribe", {
      jobId,
      sourceFileKey,
      engine: "whisper",
    });
  }
}

// ─── Error types ────────────────────────────────────────────────────

class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentError";
  }
}
