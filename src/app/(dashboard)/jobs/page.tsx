// src/app/(dashboard)/page.tsx

import { createClient } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { JobsList } from '@/components/jobs/jobs-list';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const jobs = await db.job.findMany({
    where: { userId: user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      sourceTitle: true,
      sourceType: true,
      sourceDurationSeconds: true,
      status: true,
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
          <h1 className="text-xl font-bold tracking-tight">Jobs</h1>
          <p className="text-sm text-[#6b6960]">{jobs.length} total</p>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#5046e5] to-[#7c3aed] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition hover:shadow-lg"
        >
          + New job
        </Link>
      </div>

      <JobsList
        jobs={jobs.map((j) => ({
          ...j,
          sourceDuration: j.sourceDurationSeconds,
          createdAt: j.createdAt,
          completedAt: j.processingCompletedAt,
        }))}
      />
    </div>
  );
}
