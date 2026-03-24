import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { ReviewShell } from '@/components/review/review-shell';

interface Props {
  params: { id: string };
}

export default async function ReviewPage({ params }: Props) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      sourceTitle: true,
      status: true,
    },
  });

  if (!job) notFound();

  const [clips, texts] = await Promise.all([
    prisma.clip.findMany({
      where: { jobId: params.id },
      orderBy: [{ score: 'desc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        title: true,
        hook: true,
        startTime: true,
        endTime: true,
        duration: true,
        score: true,
        scoreFactors: true,
        primarySpeakerId: true,
        speakerRole: true,
        speakersPresent: true,
        status: true,
        socialCaption: true,
        hashtags: true,
        transcriptExcerpt: true,
        renderStatus: true,
      },
    }),
    prisma.textOutput.findMany({
      where: { jobId: params.id },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        type: true,
        label: true,
        content: true,
        wordCount: true,
        status: true,
      },
    }),
  ]);

  // Map DB clips to the shape ClipList/ClipDetail expect
  const mappedClips = clips.map((c) => ({
    id: c.id,
    title: c.title,
    hook: c.hook ?? undefined,
    startTime: c.startTime,
    endTime: c.endTime,
    duration: c.duration,
    score: c.score,
    scoreFactors: c.scoreFactors as { coherence: number; hookStrength: number; topicClarity: number; emotionalEnergy: number } | undefined,
    primarySpeakerId: c.primarySpeakerId ?? '',
    speakerRole: c.speakerRole,
    speakerLabel: c.speakerRole === 'host' ? 'Host' : c.speakerRole === 'guest' ? 'Guest' : 'Speaker',
    status: c.status as 'review' | 'approved' | 'rejected',
    platforms: [] as string[],
    renderStatus: c.renderStatus,
    transcriptExcerpt: c.transcriptExcerpt,
  }));

  const mappedTexts = texts.map((t) => ({
    id: t.id,
    type: t.type,
    label: t.label,
    content: t.content,
    wordCount: t.wordCount,
    status: t.status as 'draft' | 'approved' | 'scheduled' | 'posted',
  }));

  return (
    <ReviewShell
      jobId={job.id}
      sourceTitle={job.sourceTitle ?? 'Untitled'}
      initialClips={mappedClips}
      initialTexts={mappedTexts}
    />
  );
}
