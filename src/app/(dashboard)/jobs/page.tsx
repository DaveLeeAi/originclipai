// src/app/(dashboard)/jobs/page.tsx

import { getUser } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { JobsList } from '@/components/jobs/jobs-list';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const user = await getUser();

  const jobs = await db.job.findMany({
    where: { userId: user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      sourceTitle: true,
      sourceType: true,
      sourceUrl: true,
      sourceFileKey: true,
      sourceMetadata: true,
      sourceDurationSeconds: true,
      status: true,
      currentStep: true,
      error: true,
      progress: true,
      clipCount: true,
      textOutputCount: true,
      createdAt: true,
      processingCompletedAt: true,
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)', lineHeight: '1.25', letterSpacing: '-0.01em' }}
          >
            Jobs
          </h1>
          <p
            className="mt-0.5 text-[13px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {jobs.length} total
          </p>
        </div>
        <Link href="/new">
          <Button size="md">
            <Plus size={16} strokeWidth={2} />
            New job
          </Button>
        </Link>
      </div>

      <JobsList
        jobs={jobs.map((j) => ({
          id: j.id,
          sourceTitle: j.sourceTitle,
          sourceType: j.sourceType,
          sourceUrl: j.sourceUrl,
          sourceFileKey: j.sourceFileKey,
          sourceMetadata: j.sourceMetadata as Record<string, unknown> | null,
          sourceDuration: j.sourceDurationSeconds,
          status: j.status,
          currentStep: j.currentStep,
          error: j.error,
          progress: j.progress as Record<string, unknown> | null,
          clipCount: j.clipCount,
          textOutputCount: j.textOutputCount,
          createdAt: j.createdAt,
          completedAt: j.processingCompletedAt,
        }))}
      />
    </div>
  );
}
