import { prisma } from '@/lib/db/client';
import { getSessionUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SchedulePageClient } from '@/components/schedule/schedule-page-client';

export default async function SchedulePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect('/sign-in');

  const posts = await prisma.scheduledPost.findMany({
    where: { userId },
    orderBy: { scheduledAt: 'asc' },
    include: {
      clip: {
        select: { id: true, title: true, duration: true, score: true },
      },
      textOutput: {
        select: { id: true, label: true, type: true, wordCount: true },
      },
    },
  });

  const items = posts.map((p) => ({
    id: p.id,
    type: (p.clipId ? 'clip' : 'text') as 'clip' | 'text',
    title: p.clip?.title ?? p.textOutput?.label ?? 'Untitled',
    duration: p.clip?.duration ?? undefined,
    score: p.clip?.score ?? undefined,
    wordCount: p.textOutput?.wordCount ?? undefined,
    platforms: [p.platform],
    scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : undefined,
    status: p.status as 'queued' | 'posting' | 'posted' | 'failed',
    platformPostUrl: p.platformPostUrl ?? undefined,
    error: p.error ?? undefined,
    textType: p.textOutput?.type ?? undefined,
  }));

  return <SchedulePageClient initialItems={items} />;
}
