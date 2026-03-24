import Link from 'next/link';
import { prisma } from '@/lib/db/client';
import { getSessionUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { timeAgo, formatDuration } from '@/lib/utils';

export default async function JobListPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect('/sign-in');

  const jobs = await prisma.job.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      sourceType: true,
      sourceUrl: true,
      sourceTitle: true,
      sourceDurationSeconds: true,
      status: true,
      clipCount: true,
      textOutputCount: true,
      progress: true,
      error: true,
      createdAt: true,
    },
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Jobs</h1>
          <p className="text-sm text-[#6b6960]">{jobs.length} total</p>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[#5046e5] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-[#4338ca]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="flex h-[400px] items-center justify-center rounded-2xl border border-[#e4e2dd] bg-white">
          <div className="text-center">
            <svg className="mx-auto mb-3 text-[#a09e96] opacity-40" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" />
            </svg>
            <p className="mb-1 text-sm font-medium text-[#6b6960]">No jobs yet</p>
            <p className="text-xs text-[#a09e96]">Create your first job to start repurposing content</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e4e2dd] bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#f6f5f2] text-[10px] font-bold uppercase tracking-[0.1em] text-[#a09e96]">
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Clips</th>
                <th className="px-5 py-3">Texts</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-[#f6f5f2] last:border-0 hover:bg-[#f6f5f2]/50">
                  <td className="px-5 py-3.5">
                    <div className="max-w-[300px]">
                      <div className="truncate text-[13px] font-semibold text-[#1a1a1a]">
                        {job.sourceTitle ?? job.sourceUrl ?? 'Uploaded file'}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#a09e96]">
                        <span className="capitalize">{job.sourceType.replace('_', ' ')}</span>
                        {job.sourceDurationSeconds ? (
                          <span>· {formatDuration(job.sourceDurationSeconds)}</span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[13px] text-[#6b6960]">
                    {job.clipCount}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[13px] text-[#6b6960]">
                    {job.textOutputCount}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-[#a09e96]">
                    {timeAgo(new Date(job.createdAt))}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={
                        job.status === 'complete'
                          ? `/jobs/${job.id}/review`
                          : `/jobs/${job.id}`
                      }
                      className="text-[13px] font-semibold text-[#5046e5] hover:underline"
                    >
                      {job.status === 'complete' ? 'Review' : 'View'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'green' | 'amber' | 'red' | 'accent' | 'muted'; label: string }> = {
    created: { variant: 'muted', label: 'Created' },
    ingesting: { variant: 'accent', label: 'Ingesting' },
    transcribing: { variant: 'accent', label: 'Transcribing' },
    analyzing: { variant: 'accent', label: 'Analyzing' },
    rendering: { variant: 'amber', label: 'Rendering' },
    complete: { variant: 'green', label: 'Complete' },
    failed: { variant: 'red', label: 'Failed' },
    cancelled: { variant: 'muted', label: 'Cancelled' },
  };

  const c = config[status] ?? { variant: 'muted' as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
