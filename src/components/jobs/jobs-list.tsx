// src/components/jobs/jobs-list.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, StatusDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDuration, timeAgo } from '@/lib/utils';

export interface JobSummary {
  id: string;
  sourceTitle: string | null;
  sourceType: string;
  sourceUrl: string | null;
  sourceFileKey: string | null;
  sourceMetadata: Record<string, unknown> | null;
  sourceDuration: number | null;
  status: string;
  currentStep: string | null;
  error: string | null;
  progress: Record<string, unknown> | null;
  clipCount: number;
  textOutputCount: number;
  createdAt: Date;
  completedAt: Date | null;
}

interface JobsListProps {
  jobs: JobSummary[];
}

const SOURCE_LABELS: Record<string, string> = {
  youtube_url: 'YouTube',
  video_url: 'Video URL',
  video_upload: 'Video',
  audio_upload: 'Audio',
  article_url: 'Article',
  pdf_upload: 'PDF',
};

const STATUS_LABELS: Record<string, string> = {
  created: 'Queued',
  ingesting: 'Downloading',
  transcribing: 'Transcribing',
  analyzing: 'Analyzing',
  rendering: 'Rendering',
  complete: 'Complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STEP_LABELS: Record<string, string> = {
  'ingest:error': 'Failed at download',
  'ingest:running': 'Downloading',
  'transcribe:error': 'Failed at transcription',
  'transcribe:running': 'Transcribing',
  'analyze:error': 'Failed at analysis',
  'analyze:running': 'Analyzing',
  'render:error': 'Failed at rendering',
  'render:running': 'Rendering',
};

type StatusFilter = 'all' | 'active' | 'complete' | 'failed';
type SourceFilter = 'all' | 'youtube_url' | 'video_url' | 'video_upload' | 'audio_upload' | 'article_url' | 'pdf_upload';

/** Derive a display title with meaningful fallbacks. */
function getJobTitle(job: JobSummary): string {
  // 1. Explicit source title (set by ingest worker from metadata)
  if (job.sourceTitle) return job.sourceTitle;

  // 2. Title from sourceMetadata JSON
  const meta = job.sourceMetadata;
  if (meta && typeof meta.title === 'string' && meta.title.trim()) {
    return meta.title.trim();
  }

  // 3. YouTube / article URL — extract readable info from URL
  if (job.sourceUrl) {
    try {
      const url = new URL(job.sourceUrl);
      if (job.sourceType === 'youtube_url') {
        return `YouTube video (${url.hostname})`;
      }
      if (job.sourceType === 'article_url') {
        // Use pathname for articles — often has the slug
        const slug = url.pathname.replace(/\/$/, '').split('/').pop();
        if (slug && slug.length > 3) {
          return slug.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
        }
        return url.hostname;
      }
      // Generic URL fallback
      const filename = url.pathname.split('/').pop();
      if (filename && filename.length > 3) {
        return filename.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
      }
      return url.hostname;
    } catch {
      // Invalid URL — fall through
    }
  }

  // 4. Upload filename from sourceFileKey
  if (job.sourceFileKey) {
    const filename = job.sourceFileKey.split('/').pop();
    if (filename) {
      return filename.replace(/\.\w+$/, '').replace(/[-_]/g, ' ');
    }
  }

  // 5. Source type label as last resort
  return `${SOURCE_LABELS[job.sourceType] ?? 'Unknown'} job`;
}

/** Detect if a job is from the demo seed script. */
function isDemoJob(job: JobSummary): boolean {
  if (job.sourceUrl?.includes('demo_fixture_id')) return true;
  const meta = job.sourceMetadata;
  if (meta && typeof meta.author === 'string' && meta.author === 'Demo Creator') return true;
  return false;
}

/** Get the failed pipeline step label from currentStep or progress. */
function getFailedStepLabel(job: JobSummary): string | null {
  if (job.status !== 'failed') return null;

  // currentStep is formatted as "step:status" (e.g. "ingest:error")
  if (job.currentStep) {
    const label = STEP_LABELS[job.currentStep];
    if (label) return label;
    // Parse the step name
    const stepName = job.currentStep.split(':')[0];
    if (stepName) return `Failed at ${stepName}`;
  }

  // Fallback: scan progress JSONB for an 'error' step status
  if (job.progress) {
    const steps = ['ingest', 'transcribe', 'analyze', 'render'] as const;
    for (const step of steps) {
      if (job.progress[step] === 'error') {
        return STEP_LABELS[`${step}:error`] ?? `Failed at ${step}`;
      }
    }
  }

  return null;
}

export function JobsList({ jobs }: JobsListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e4e2dd] bg-[#f6f5f2]">
          <svg className="text-[#a09e96]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-bold">No jobs yet</h2>
        <p className="mb-6 max-w-sm text-sm text-[#6b6960]">
          Paste a YouTube URL, upload a video, or drop in an article to get started.
        </p>
        <Link href="/new">
          <Button size="lg">Create your first job</Button>
        </Link>
      </div>
    );
  }

  // Compute available filters from data
  const hasStatuses = {
    active: jobs.some((j) => ['created', 'ingesting', 'transcribing', 'analyzing', 'rendering'].includes(j.status)),
    complete: jobs.some((j) => j.status === 'complete'),
    failed: jobs.some((j) => j.status === 'failed' || j.status === 'cancelled'),
  };

  const sourceTypes = Array.from(new Set(jobs.map((j) => j.sourceType)));

  // Filter jobs
  const filtered = jobs.filter((job) => {
    if (statusFilter === 'active' && !['created', 'ingesting', 'transcribing', 'analyzing', 'rendering'].includes(job.status)) return false;
    if (statusFilter === 'complete' && job.status !== 'complete') return false;
    if (statusFilter === 'failed' && job.status !== 'failed' && job.status !== 'cancelled') return false;
    if (sourceFilter !== 'all' && job.sourceType !== sourceFilter) return false;
    return true;
  });

  async function handleRetry(e: React.MouseEvent, jobId: string): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    setRetryingIds((prev) => new Set(prev).add(jobId));
    try {
      const res = await fetch(`/api/v1/jobs/${jobId}/retry`, { method: 'POST' });
      if (res.ok) {
        router.push(`/jobs/${jobId}`);
      } else {
        setRetryingIds((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }
    } catch {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Status filter */}
        <div className="flex items-center gap-1 rounded-lg border border-[#e4e2dd] bg-white p-0.5">
          <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            All
          </FilterButton>
          {hasStatuses.active && (
            <FilterButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
              Active
            </FilterButton>
          )}
          {hasStatuses.complete && (
            <FilterButton active={statusFilter === 'complete'} onClick={() => setStatusFilter('complete')}>
              Complete
            </FilterButton>
          )}
          {hasStatuses.failed && (
            <FilterButton active={statusFilter === 'failed'} onClick={() => setStatusFilter('failed')}>
              Failed
            </FilterButton>
          )}
        </div>

        {/* Source type filter — only show if more than 1 type */}
        {sourceTypes.length > 1 && (
          <div className="flex items-center gap-1 rounded-lg border border-[#e4e2dd] bg-white p-0.5">
            <FilterButton active={sourceFilter === 'all'} onClick={() => setSourceFilter('all')}>
              All types
            </FilterButton>
            {sourceTypes.map((type) => (
              <FilterButton
                key={type}
                active={sourceFilter === type}
                onClick={() => setSourceFilter(type as SourceFilter)}
              >
                {SOURCE_LABELS[type] ?? type}
              </FilterButton>
            ))}
          </div>
        )}

        {/* Result count */}
        {(statusFilter !== 'all' || sourceFilter !== 'all') && (
          <span className="ml-1 text-xs text-[#a09e96]">
            {filtered.length} of {jobs.length}
          </span>
        )}
      </div>

      {/* Job list */}
      <div className="space-y-2">
        {filtered.map((job) => {
          const isActive = ['created', 'ingesting', 'transcribing', 'analyzing', 'rendering'].includes(job.status);
          const isFailed = job.status === 'failed' || job.status === 'cancelled';
          const href = job.status === 'complete'
            ? `/jobs/${job.id}/review`
            : `/jobs/${job.id}`;
          const title = getJobTitle(job);
          const demo = isDemoJob(job);
          const failedStep = getFailedStepLabel(job);
          const isRetrying = retryingIds.has(job.id);

          return (
            <Link
              key={job.id}
              href={href}
              className={`flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
                isFailed
                  ? 'border-[#dc2626]/20 hover:border-[#dc2626]/30'
                  : 'border-[#e4e2dd] hover:border-[#d4d2cc]'
              }`}
            >
              {/* Source type badge */}
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                isFailed
                  ? 'border-[#dc2626]/20 bg-[#dc2626]/[0.04]'
                  : 'border-[#e4e2dd] bg-[#f6f5f2]'
              }`}>
                <span className={`text-[10px] font-bold ${isFailed ? 'text-[#dc2626]' : 'text-[#6b6960]'}`}>
                  {SOURCE_LABELS[job.sourceType]?.slice(0, 3).toUpperCase() ?? '???'}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{title}</span>
                  {demo && (
                    <Badge variant="muted">Demo</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[#a09e96]">
                  <span>{SOURCE_LABELS[job.sourceType] ?? job.sourceType}</span>
                  {job.sourceDuration != null && job.sourceDuration > 0 && (
                    <>
                      <span>·</span>
                      <span>{formatDuration(job.sourceDuration)}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{timeAgo(new Date(job.createdAt))}</span>
                </div>

                {/* Failed job: show error reason + failed step inline */}
                {isFailed && (job.error || failedStep) && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-[#dc2626]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span className="truncate">
                      {failedStep && <span className="font-semibold">{failedStep}: </span>}
                      {job.error ?? 'Unknown error'}
                    </span>
                  </div>
                )}
              </div>

              {/* Status + actions */}
              <div className="flex items-center gap-2 shrink-0">
                {job.status === 'complete' && (
                  <div className="flex gap-1.5">
                    <Badge variant="green">{job.clipCount} clips</Badge>
                    <Badge variant="cyan">{job.textOutputCount} text</Badge>
                  </div>
                )}

                {isFailed && (
                  <button
                    onClick={(e) => handleRetry(e, job.id)}
                    disabled={isRetrying}
                    className="rounded-lg border border-[#e4e2dd] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6b6960] shadow-sm transition hover:border-[#5046e5] hover:text-[#5046e5] hover:shadow-md disabled:opacity-50"
                  >
                    {isRetrying ? 'Retrying...' : 'Retry'}
                  </button>
                )}

                <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${
                  isFailed
                    ? 'border-[#dc2626]/20 bg-[#dc2626]/[0.04]'
                    : 'border-[#e4e2dd] bg-[#f6f5f2]'
                }`}>
                  <StatusDot status={isFailed ? 'failed' : isActive ? 'queued' : 'draft'} />
                  <span className={`text-[11px] font-semibold ${
                    isFailed ? 'text-[#dc2626]' : isActive ? 'text-[#5046e5]' : 'text-[#6b6960]'
                  }`}>
                    {STATUS_LABELS[job.status] ?? job.status}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-[#a09e96]">
            No jobs match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
        active
          ? 'bg-[#5046e5]/[0.08] text-[#5046e5]'
          : 'text-[#6b6960] hover:text-[#1a1a1a]'
      }`}
    >
      {children}
    </button>
  );
}
