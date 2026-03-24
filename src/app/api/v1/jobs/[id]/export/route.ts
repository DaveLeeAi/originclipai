import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getStorageProvider } from "@/lib/providers/storage-supabase";
import { z } from "zod";

const querySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("clip"),
    clipId: z.string().uuid(),
    aspect: z.enum(["9x16", "1x1", "16x9"]).default("9x16"),
  }),
  z.object({
    type: z.literal("texts"),
  }),
  z.object({
    type: z.literal("manifest"),
  }),
]);

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
 * GET /api/v1/jobs/:id/export
 *
 * Export job outputs.
 *
 * Query params:
 *   ?type=clip&clipId=xxx&aspect=9x16 — Get signed download URL for a single clip
 *   ?type=texts                        — Get all text outputs as JSON with markdown content
 *   ?type=manifest                     — Get manifest of all downloadable files with signed URLs
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
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

    // Parse query params
    const url = new URL(request.url);
    const rawType = url.searchParams.get("type");

    if (!rawType) {
      return NextResponse.json(
        { error: "Missing required query param: type (clip | texts | manifest)" },
        { status: 400 },
      );
    }

    const rawQuery: Record<string, string> = { type: rawType };
    if (rawType === "clip") {
      const clipId = url.searchParams.get("clipId");
      if (clipId) rawQuery.clipId = clipId;
      const aspect = url.searchParams.get("aspect");
      if (aspect) rawQuery.aspect = aspect;
    }

    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const query = parsed.data;

    if (query.type === "clip") {
      return handleClipExport(jobId, query.clipId, query.aspect);
    }

    if (query.type === "texts") {
      return handleTextsExport(jobId);
    }

    return handleManifestExport(jobId, job.sourceTitle);
  } catch (error) {
    console.error(`[api] GET /api/v1/jobs/${params.id}/export error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── Clip Export ────────────────────────────────────────────────────

async function handleClipExport(
  jobId: string,
  clipId: string,
  aspect: "9x16" | "1x1" | "16x9",
): Promise<NextResponse> {
  const clip = await prisma.clip.findFirst({
    where: { id: clipId, jobId },
    select: {
      id: true,
      title: true,
      renderStatus: true,
      renderedFiles: true,
    },
  });

  if (!clip) {
    return NextResponse.json(
      { error: "Clip not found or does not belong to this job" },
      { status: 404 },
    );
  }

  if (clip.renderStatus !== "complete") {
    return NextResponse.json(
      { error: "Clip not yet rendered", renderStatus: clip.renderStatus },
      { status: 409 },
    );
  }

  const renderedFiles = clip.renderedFiles as RenderedFilesRecord;
  const file = renderedFiles[aspect] as RenderedFileInfo | undefined;

  if (!file?.storageKey) {
    const available = Object.keys(renderedFiles).filter(
      (k) => k !== "captions" && (renderedFiles[k] as RenderedFileInfo)?.storageKey,
    );
    return NextResponse.json(
      { error: `No rendered file for aspect ratio ${aspect}`, available },
      { status: 404 },
    );
  }

  const storage = getStorageProvider();
  const signedUrl = await storage.getSignedUrl(file.storageKey, {
    expiresIn: 3600,
  });

  return NextResponse.json({
    clipId: clip.id,
    title: clip.title,
    aspectRatio: aspect,
    width: file.width,
    height: file.height,
    downloadUrl: signedUrl,
    expiresIn: 3600,
  });
}

// ─── Texts Export ───────────────────────────────────────────────────

interface TextExportItem {
  id: string;
  type: string;
  label: string;
  content: string;
  wordCount: number;
  status: string;
  promptTemplateId: string | null;
  createdAt: string;
}

async function handleTextsExport(jobId: string): Promise<NextResponse> {
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
      status: true,
      promptTemplateId: true,
      createdAt: true,
    },
  });

  const items: TextExportItem[] = texts.map((t) => ({
    id: t.id,
    type: t.type,
    label: t.label,
    content: t.content,
    wordCount: t.wordCount,
    status: t.status,
    promptTemplateId: t.promptTemplateId,
    createdAt: t.createdAt.toISOString(),
  }));

  // Build combined markdown for convenience
  const markdownParts = texts.map((t) => {
    const header = `# ${t.label}\n\n_Type: ${t.type} | Words: ${t.wordCount}_\n\n`;
    if (t.type === "x_thread" && t.threadPosts) {
      const posts = t.threadPosts as Array<{ postNumber: number; text: string }>;
      const threadContent = posts
        .map((p) => `**Post ${p.postNumber}:**\n${p.text}`)
        .join("\n\n---\n\n");
      return `${header}${threadContent}`;
    }
    return `${header}${t.content}`;
  });

  return NextResponse.json({
    jobId,
    texts: items,
    total: items.length,
    markdown: markdownParts.join("\n\n---\n\n"),
  });
}

// ─── Manifest Export ────────────────────────────────────────────────

interface ManifestClip {
  clipId: string;
  title: string;
  score: number;
  status: string;
  renderStatus: string;
  downloads: Record<string, { downloadUrl: string; width: number; height: number }>;
  captions: {
    srt?: string;
    vtt?: string;
  };
}

interface ManifestText {
  id: string;
  type: string;
  label: string;
  wordCount: number;
  status: string;
  isCustomTemplate: boolean;
}

async function handleManifestExport(
  jobId: string,
  sourceTitle: string | null,
): Promise<NextResponse> {
  const storage = getStorageProvider();

  // Fetch all clips
  const clips = await prisma.clip.findMany({
    where: { jobId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      score: true,
      status: true,
      renderStatus: true,
      renderedFiles: true,
    },
  });

  // Fetch all text outputs
  const texts = await prisma.textOutput.findMany({
    where: { jobId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      type: true,
      label: true,
      wordCount: true,
      status: true,
      promptTemplateId: true,
    },
  });

  // Build clip manifest with signed URLs
  const manifestClips: ManifestClip[] = [];
  for (const clip of clips) {
    const renderedFiles = clip.renderedFiles as RenderedFilesRecord;
    const downloads: Record<string, { downloadUrl: string; width: number; height: number }> = {};
    const captions: { srt?: string; vtt?: string } = {};

    for (const [key, value] of Object.entries(renderedFiles)) {
      if (key === "captions") {
        const captionFiles = value as CaptionFiles;
        if (captionFiles.srt) {
          try {
            captions.srt = await storage.getSignedUrl(captionFiles.srt, { expiresIn: 3600 });
          } catch {
            // Caption file may not exist
          }
        }
        if (captionFiles.vtt) {
          try {
            captions.vtt = await storage.getSignedUrl(captionFiles.vtt, { expiresIn: 3600 });
          } catch {
            // Caption file may not exist
          }
        }
      } else {
        const fileInfo = value as RenderedFileInfo;
        if (fileInfo?.storageKey) {
          try {
            const signedUrl = await storage.getSignedUrl(fileInfo.storageKey, {
              expiresIn: 3600,
            });
            downloads[key] = {
              downloadUrl: signedUrl,
              width: fileInfo.width,
              height: fileInfo.height,
            };
          } catch {
            // Storage key may be invalid
          }
        }
      }
    }

    manifestClips.push({
      clipId: clip.id,
      title: clip.title,
      score: clip.score,
      status: clip.status,
      renderStatus: clip.renderStatus,
      downloads,
      captions,
    });
  }

  const manifestTexts: ManifestText[] = texts.map((t) => ({
    id: t.id,
    type: t.type,
    label: t.label,
    wordCount: t.wordCount,
    status: t.status,
    isCustomTemplate: t.promptTemplateId !== null,
  }));

  return NextResponse.json({
    jobId,
    sourceTitle,
    expiresIn: 3600,
    clips: manifestClips,
    texts: manifestTexts,
    clipCount: manifestClips.length,
    textCount: manifestTexts.length,
  });
}
