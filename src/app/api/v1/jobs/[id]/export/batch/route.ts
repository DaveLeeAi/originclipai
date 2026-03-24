import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getStorageProvider } from "@/lib/providers/storage-supabase";
import { z } from "zod";
import archiver from "archiver";
import { PassThrough } from "stream";
import type { StorageProvider } from "@/lib/providers/storage";

const querySchema = z.object({
  include: z
    .enum(["clips", "texts", "full"])
    .default("full"),
  clipStatus: z
    .enum(["approved", "all"])
    .default("approved"),
});

interface RenderedFileInfo {
  storageKey: string;
  width: number;
  height: number;
}

interface CaptionFiles {
  srt?: string;
  vtt?: string;
}

type RenderedFilesRecord = Record<string, RenderedFileInfo | CaptionFiles>;

/**
 * GET /api/v1/jobs/:id/export/batch
 *
 * Batch export as a ZIP archive streamed to the client.
 *
 * Query params:
 *   ?include=clips  — ZIP of rendered clip MP4s only
 *   ?include=texts  — ZIP of text outputs as Markdown files
 *   ?include=full   — ZIP of everything: clips + texts + caption files (default)
 *   ?clipStatus=approved — Only include approved clips (default)
 *   ?clipStatus=all      — Include all clips regardless of status
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const jobId = params.id;

    // Verify job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, userId: true, sourceTitle: true, status: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "complete") {
      return NextResponse.json(
        { error: "Job is not complete. Cannot export until processing finishes.", status: job.status },
        { status: 409 },
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      include: url.searchParams.get("include") ?? "full",
      clipStatus: url.searchParams.get("clipStatus") ?? "approved",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { include, clipStatus } = parsed.data;
    const storage = getStorageProvider();
    const safeTitle = sanitizeFilename(job.sourceTitle ?? "export");

    // Create ZIP archive
    const archive = archiver("zip", { zlib: { level: 6 } });
    const passthrough = new PassThrough();
    archive.pipe(passthrough);

    // Track errors on archive
    let archiveError: Error | null = null;
    archive.on("error", (err) => {
      archiveError = err;
      console.error(`[export-batch] Archive error for job ${jobId}:`, err);
    });

    const includeClips = include === "clips" || include === "full";
    const includeTexts = include === "texts" || include === "full";

    // Add clips to ZIP
    if (includeClips) {
      await addClipsToArchive(archive, storage, jobId, clipStatus);
    }

    // Add texts to ZIP
    if (includeTexts) {
      await addTextsToArchive(archive, jobId);
    }

    // Add caption files for full export
    if (include === "full") {
      await addCaptionsToArchive(archive, storage, jobId, clipStatus);
    }

    // Finalize the archive
    await archive.finalize();

    if (archiveError) {
      return NextResponse.json(
        { error: "Failed to create ZIP archive" },
        { status: 500 },
      );
    }

    // Convert PassThrough to ReadableStream for the Response
    const readable = nodeStreamToWebReadable(passthrough);

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeTitle}-${include}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(`[api] GET /api/v1/jobs/${params.id}/export/batch error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── Archive Builders ───────────────────────────────────────────────

async function addClipsToArchive(
  archive: archiver.Archiver,
  storage: StorageProvider,
  jobId: string,
  clipStatus: "approved" | "all",
): Promise<void> {
  const whereClause = clipStatus === "approved"
    ? { jobId, status: "approved" as const, renderStatus: "complete" }
    : { jobId, renderStatus: "complete" };

  const clips = await prisma.clip.findMany({
    where: whereClause,
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      sortOrder: true,
      renderedFiles: true,
    },
  });

  for (const clip of clips) {
    const renderedFiles = clip.renderedFiles as RenderedFilesRecord;
    const safeTitle = sanitizeFilename(clip.title);
    const clipIndex = String(clip.sortOrder + 1).padStart(2, "0");

    for (const [aspect, value] of Object.entries(renderedFiles)) {
      if (aspect === "captions") continue;

      const fileInfo = value as RenderedFileInfo;
      if (!fileInfo?.storageKey) continue;

      try {
        const buffer = await storage.download(fileInfo.storageKey);
        const filename = `clips/${clipIndex}-${safeTitle}-${aspect}.mp4`;
        archive.append(buffer, { name: filename });
      } catch (err) {
        console.warn(
          `[export-batch] Failed to download clip file ${fileInfo.storageKey}:`,
          err,
        );
        // Non-fatal — skip this file and continue
      }
    }
  }
}

async function addTextsToArchive(
  archive: archiver.Archiver,
  jobId: string,
): Promise<void> {
  const texts = await prisma.textOutput.findMany({
    where: { jobId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      type: true,
      label: true,
      content: true,
      wordCount: true,
      threadPosts: true,
      sortOrder: true,
    },
  });

  for (const text of texts) {
    const safeLabel = sanitizeFilename(text.label);
    const textIndex = String(text.sortOrder + 1).padStart(2, "0");

    let markdown = `# ${text.label}\n\n`;
    markdown += `_Type: ${text.type} | Words: ${text.wordCount}_\n\n`;

    if (text.type === "x_thread" && text.threadPosts) {
      const posts = text.threadPosts as Array<{ postNumber: number; text: string }>;
      markdown += posts
        .map((p) => `**Post ${p.postNumber}:**\n\n${p.text}`)
        .join("\n\n---\n\n");
    } else {
      markdown += text.content;
    }

    const filename = `texts/${textIndex}-${safeLabel}.md`;
    archive.append(Buffer.from(markdown, "utf-8"), { name: filename });
  }
}

async function addCaptionsToArchive(
  archive: archiver.Archiver,
  storage: StorageProvider,
  jobId: string,
  clipStatus: "approved" | "all",
): Promise<void> {
  const whereClause = clipStatus === "approved"
    ? { jobId, status: "approved" as const, renderStatus: "complete" }
    : { jobId, renderStatus: "complete" };

  const clips = await prisma.clip.findMany({
    where: whereClause,
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      sortOrder: true,
      renderedFiles: true,
    },
  });

  for (const clip of clips) {
    const renderedFiles = clip.renderedFiles as RenderedFilesRecord;
    const captionData = renderedFiles.captions as CaptionFiles | undefined;
    if (!captionData) continue;

    const safeTitle = sanitizeFilename(clip.title);
    const clipIndex = String(clip.sortOrder + 1).padStart(2, "0");

    for (const [format, storageKey] of Object.entries(captionData)) {
      if (!storageKey) continue;

      try {
        const buffer = await storage.download(storageKey);
        const filename = `captions/${clipIndex}-${safeTitle}.${format}`;
        archive.append(buffer, { name: filename });
      } catch (err) {
        console.warn(
          `[export-batch] Failed to download caption file ${storageKey}:`,
          err,
        );
        // Non-fatal — skip this file and continue
      }
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Sanitize a string for use as a filename.
 * Removes special characters, trims, and limits length.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 80)
    || "untitled";
}

/**
 * Convert a Node.js Readable stream to a Web ReadableStream.
 */
function nodeStreamToWebReadable(nodeStream: PassThrough): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}
