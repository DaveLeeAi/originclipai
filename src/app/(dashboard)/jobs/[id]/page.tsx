import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { ProgressChecklist } from '@/components/processing/progress-checklist';

interface Props {
  params: { id: string };
}

export default async function JobProcessingPage({ params }: Props) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      status: true,
      sourceTitle: true,
      sourceType: true,
    },
  });

  if (!job) notFound();

  // If already complete, redirect straight to review
  if (job.status === 'complete') {
    redirect(`/jobs/${job.id}/review`);
  }

  const isTextOnly = job.sourceType === 'article_url' || job.sourceType === 'pdf_upload';

  return (
    <ProgressChecklist
      jobId={job.id}
      sourceTitle={job.sourceTitle ?? undefined}
      isTextOnly={isTextOnly}
    />
  );
}
