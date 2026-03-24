// src/app/api/v1/export/route.ts

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { z } from 'zod';

const exportRequestSchema = z.object({
  jobId: z.string().uuid(),
  exportType: z.enum(['single_clip', 'all_clips', 'all_texts', 'full_package']),
  clipId: z.string().uuid().optional(),
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

  const { jobId, exportType, clipId } = parsed.data;

  // Verify job ownership
  const job = await db.job.findFirst({
    where: { id: jobId, userId: user.id },
    select: { id: true, status: true },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (job.status !== 'COMPLETE') {
    return NextResponse.json({ error: 'Job must be complete before exporting' }, { status: 400 });
  }

  if (exportType === 'single_clip' && !clipId) {
    return NextResponse.json({ error: 'clipId required for single clip export' }, { status: 400 });
  }

  // For single clip downloads, return a signed URL directly (no queue needed)
  if (exportType === 'single_clip' && clipId) {
    const clip = await db.clip.findFirst({
      where: { id: clipId, jobId },
      select: { renderedFiles: true, title: true },
    });

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    const rendered = clip.renderedFiles as Record<string, string>;
    const fileKey = rendered['9x16'] ?? Object.values(rendered)[0];

    if (!fileKey) {
      return NextResponse.json({ error: 'Clip not yet rendered' }, { status: 400 });
    }

    // TODO: Generate signed download URL from storage provider
    // const url = await storageProvider.getSignedUrl(fileKey, 3600);

    return NextResponse.json({
      downloadUrl: `/api/v1/export/download?key=${encodeURIComponent(fileKey)}`,
      fileName: `${clip.title}.mp4`,
    });
  }

  // For batch exports, enqueue an export job
  // TODO: Enqueue to export queue
  // await exportQueue.add('export', { jobId, userId: user.id, exportType, clipId });

  return NextResponse.json({
    message: 'Export started. You\'ll receive a download link when ready.',
    exportType,
  }, { status: 202 });
}
