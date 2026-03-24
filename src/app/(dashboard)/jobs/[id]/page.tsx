// src/app/(dashboard)/jobs/[id]/page.tsx

import { getUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { notFound, redirect } from 'next/navigation';
import { ProgressChecklist } from '@/components/processing/progress-checklist';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JobPage({ params }: Props) {
  const { id } = await params;
  const user = await getUser();

  const job = await db.job.findFirst({
    where: { id, userId: user!.id },
    select: {
      id: true,
      status: true,
      sourceTitle: true,
      sourceType: true,
      error: true,
    },
  });

  if (!job) notFound();

  // If already complete, redirect to review
  if (job.status === 'complete') {
    redirect(`/jobs/${id}/review`);
  }

  const isTextOnly = ['article_url', 'pdf_upload'].includes(job.sourceType);

  return (
    <ProgressChecklist
      jobId={job.id}
      sourceTitle={job.sourceTitle ?? undefined}
      isTextOnly={isTextOnly}
      initialStatus={job.status}
      initialError={job.error ?? undefined}
    />
  );
}
