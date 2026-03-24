// src/app/api/v1/export/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { getStorageProvider } from '@/lib/providers/storage-supabase';
import { z } from 'zod';

interface RenderedFileInfo {
  storageKey: string;
  width: number;
  height: number;
}

const exportRequestSchema = z.object({
  jobId: z.string().uuid(),
  exportType: z.enum(['single_clip', 'all_clips', 'all_texts', 'full_package']),
  clipId: z.string().uuid().optional(),
  aspect: z.enum(['9x16', '1x1', '16x9']).default('9x16'),
});

/**
 * POST /api/v1/export — request an export package
 */
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = exportRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { jobId, exportType, clipId, aspect } = parsed.data;

  // Verify job ownership
  const job = await db.job.findFirst({
    where: { id: jobId, userId: user.id },
    select: { id: true, status: true, sourceTitle: true },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (job.status !== 'complete') {
    return NextResponse.json({ error: 'Job must be complete before exporting' }, { status: 400 });
  }

  const storage = getStorageProvider();

  // ─── Single clip export ─────────────────────────────────────────
  if (exportType === 'single_clip') {
    if (!clipId) {
      return NextResponse.json({ error: 'clipId required for single clip export' }, { status: 400 });
    }

    const clip = await db.clip.findFirst({
      where: { id: clipId, jobId },
      select: { renderedFiles: true, title: true, renderStatus: true },
    });

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    if (clip.renderStatus !== 'complete') {
      return NextResponse.json({ error: 'Clip not yet rendered' }, { status: 409 });
    }

    const rendered = clip.renderedFiles as unknown as Record<string, RenderedFileInfo>;
    const file = rendered[aspect] ?? Object.values(rendered).find((v): v is RenderedFileInfo => typeof v === 'object' && 'storageKey' in v);

    if (!file?.storageKey) {
      return NextResponse.json({ error: 'No rendered file available' }, { status: 400 });
    }

    const downloadUrl = await storage.getSignedUrl(file.storageKey, { expiresIn: 3600 });

    return NextResponse.json({
      downloadUrl,
      fileName: `${clip.title}.mp4`,
      expiresIn: 3600,
    });
  }

  // ─── All texts export ───────────────────────────────────────────
  if (exportType === 'all_texts') {
    const texts = await db.textOutput.findMany({
      where: { jobId },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        type: true,
        label: true,
        content: true,
        wordCount: true,
        threadPosts: true,
        status: true,
      },
    });

    const markdownParts = texts.map((t) => {
      const header = `# ${t.label}\n\n_Type: ${t.type} | Words: ${t.wordCount} | Status: ${t.status}_\n\n`;
      if (t.type === 'x_thread' && t.threadPosts) {
        const posts = t.threadPosts as Array<{ postNumber: number; text: string }>;
        return `${header}${posts.map((p) => `**Post ${p.postNumber}:**\n${p.text}`).join('\n\n---\n\n')}`;
      }
      return `${header}${t.content}`;
    });

    return NextResponse.json({
      texts: texts.map((t) => ({ id: t.id, type: t.type, label: t.label, content: t.content, wordCount: t.wordCount, status: t.status })),
      total: texts.length,
      markdown: markdownParts.join('\n\n---\n\n'),
      fileName: `${job.sourceTitle ?? 'export'}-texts.md`,
    });
  }

  // ─── All clips or full package export ───────────────────────────
  const clips = await db.clip.findMany({
    where: { jobId, renderStatus: 'complete' },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, title: true, renderedFiles: true, score: true },
  });

  const clipDownloads: Array<{ clipId: string; title: string; score: number; downloadUrl: string }> = [];

  for (const clip of clips) {
    const rendered = clip.renderedFiles as unknown as Record<string, RenderedFileInfo>;
    const file = rendered[aspect] ?? Object.values(rendered).find((v): v is RenderedFileInfo => typeof v === 'object' && 'storageKey' in v);
    if (file?.storageKey) {
      try {
        const url = await storage.getSignedUrl(file.storageKey, { expiresIn: 3600 });
        clipDownloads.push({ clipId: clip.id, title: clip.title, score: clip.score, downloadUrl: url });
      } catch {
        // Skip clips with invalid storage keys
      }
    }
  }

  if (exportType === 'all_clips') {
    return NextResponse.json({
      clips: clipDownloads,
      total: clipDownloads.length,
      expiresIn: 3600,
    });
  }

  // full_package: clips + texts
  const texts = await db.textOutput.findMany({
    where: { jobId },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, type: true, label: true, content: true, wordCount: true, status: true },
  });

  return NextResponse.json({
    sourceTitle: job.sourceTitle,
    clips: clipDownloads,
    clipCount: clipDownloads.length,
    texts: texts.map((t) => ({ id: t.id, type: t.type, label: t.label, content: t.content, wordCount: t.wordCount, status: t.status })),
    textCount: texts.length,
    expiresIn: 3600,
  });
}
