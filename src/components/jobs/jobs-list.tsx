// src/components/jobs/jobs-list.tsx
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  PlayCircle,
  FileText,
  Video,
  Music,
  Upload,
  File,
  MoreVertical,
  AlertCircle,
  Trash2,
  Plus,
} from 'lucide-react';
import { Badge, StatusDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatDuration, timeAgo } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

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

const SOURCE_ICONS: Record<string, LucideIcon> = {
  youtube_url: PlayCircle,
  video_url: Video,
  video_upload: Video,
  audio_upload: Music,
  article_url: FileText,
  pdf_upload: File,
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

/** Status dot color for the job list — maps job status to the semantic status used by StatusDot. */
function getJobStatusDotStatus(jobStatus: string): 'queued' | 'posting' | 'approved' | 'failed' | 'draft' {
  if (['created'].includes(jobStatus)) return 'queued';
  if (['ingesting', 'transcribing', 'analyzing', 'rendering'].includes(jobStatus)) return 'posting'; // pulsing blue
  if (jobStatus === 'complete') return 'approved'; // green
  if (jobStatus === 'failed') return 'failed';
  if (jobStatus === 'cancelled') return 'draft'; // gray
  return 'draft';
}

/** Status text color for the job list. */
function getStatusTextColor(jobStatus: string): string {
  if (['created'].includes(jobStatus)) return 'var(--pending)';
  if (['ingesting', 'transcribing', 'analyzing', 'rendering'].includes(jobStatus)) return 'var(--info)';
  if (jobStatus === 'complete') return 'var(--success)';
  if (jobStatus === 'failed') return 'var(--error)';
  if (jobStatus === 'cancelled') return 'var(--text-tertiary)';
  return 'var(--text-secondary)';
}

/** Derive a display title with meaningful fallbacks. */
function getJobTitle(job: JobSummary): string {
  if (job.sourceTitle) return job.sourceTitle;

  const meta = job.sourceMetadata;
  if (meta && typeof meta.title === 'string' && meta.title.trim()) {
    return meta.title.trim();
  }

  if (job.sourceUrl) {
    try {
      const url = new URL(job.sourceUrl);
      if (job.sourceType === 'youtube_url') {
        return `YouTube video (${url.hostname})`;
      }
      if (job.sourceType === 'article_url') {
        const slug = url.pathname.replace(/\/$/, '').split('/').pop();
        if (slug && slug.length > 3) {
          return slug.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
        }
        return url.hostname;
      }
      const filename = url.pathname.split('/').pop();
      if (filename && filename.length > 3) {
        return filename.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
      }
      return url.hostname;
    } catch {
      // Invalid URL — fall through
    }
  }

  if (job.sourceFileKey) {
    const filename = job.sourceFileKey.split('/').pop();
    if (filename) {
      return filename.replace(/\.\w+$/, '').replace(/[-_]/g, ' ');
    }
  }

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

  if (job.currentStep) {
    const label = STEP_LABELS[job.currentStep];
    if (label) return label;
    const stepName = job.currentStep.split(':')[0];
    if (stepName) return `Failed at ${stepName}`;
  }

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

/** Delete a single job via API. Returns true on success. */
async function deleteJob(jobId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/v1/jobs/${jobId}`, { method: 'DELETE' });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

/** Cancel a running job via API. Returns true on success. */
async function cancelJob(jobId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/v1/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Framer Motion variants ──────────────────────────────────────────

const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
};

// ─── Main Component ──────────────────────────────────────────────────

export function JobsList({ jobs }: JobsListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const toggleSelected = useCallback((e: React.MouseEvent, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ─── Empty state ───────────────────────────────────────────────────

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'var(--bg-surface-2)' }}
        >
          <Upload size={24} strokeWidth={1.5} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <h2
          className="mb-2 text-xl font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          No jobs yet
        </h2>
        <p
          className="mb-6 max-w-sm text-[14px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          Paste a YouTube URL, upload a video, or drop in an article to get started.
        </p>
        <Link href="/new">
          <Button size="lg">
            <Plus size={16} strokeWidth={2} />
            Create your first job
          </Button>
        </Link>
      </div>
    );
  }

  // ─── Filters ───────────────────────────────────────────────────────

  const hasStatuses = {
    active: jobs.some((j) => ['created', 'ingesting', 'transcribing', 'analyzing', 'rendering'].includes(j.status)),
    complete: jobs.some((j) => j.status === 'complete'),
    failed: jobs.some((j) => j.status === 'failed' || j.status === 'cancelled'),
  };

  const failedJobs = jobs.filter((j) => j.status === 'failed' || j.status === 'cancelled');
  const sourceTypes = Array.from(new Set(jobs.map((j) => j.sourceType)));

  const filtered = jobs.filter((job) => {
    if (statusFilter === 'active' && !['created', 'ingesting', 'transcribing', 'analyzing', 'rendering'].includes(job.status)) return false;
    if (statusFilter === 'complete' && job.status !== 'complete') return false;
    if (statusFilter === 'failed' && job.status !== 'failed' && job.status !== 'cancelled') return false;
    if (sourceFilter !== 'all' && job.sourceType !== sourceFilter) return false;
    return true;
  });

  const visibleSelectedCount = filtered.filter((j) => selectedIds.has(j.id)).length;

  // ─── Action handlers ──────────────────────────────────────────────

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

  async function handleCancel(e: React.MouseEvent, job: JobSummary): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const title = getJobTitle(job);
    const confirmed = await confirm({
      title: `Cancel "${title}"?`,
      description: 'The job will stop processing. Any outputs already generated will remain.',
      confirmText: 'Cancel Job',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setCancellingIds((prev) => new Set(prev).add(job.id));
    const success = await cancelJob(job.id);
    setCancellingIds((prev) => {
      const next = new Set(prev);
      next.delete(job.id);
      return next;
    });
    if (success) {
      toast.success('Job cancelled');
      router.refresh();
    } else {
      toast.error('Failed to cancel job');
    }
  }

  async function handleDelete(e: React.MouseEvent, job: JobSummary): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const title = getJobTitle(job);
    const confirmed = await confirm({
      title: `Delete "${title}"?`,
      description: 'All clips and text outputs will be permanently removed.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setDeletingIds((prev) => new Set(prev).add(job.id));
    const success = await deleteJob(job.id);
    if (success) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      toast.success('Job deleted');
      router.refresh();
    } else {
      toast.error('Failed to delete job');
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  }

  async function handleClearFailed(): Promise<void> {
    const count = failedJobs.length;
    const confirmed = await confirm({
      title: `Delete ${count} failed job${count === 1 ? '' : 's'}?`,
      description: 'This will permanently remove them and all associated data.',
      confirmText: 'Delete All',
      variant: 'destructive',
    });
    if (!confirmed) return;

    const ids = failedJobs.map((j) => j.id);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });

    await Promise.all(ids.map((id) => deleteJob(id)));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });

    toast.success(`${count} failed job${count === 1 ? '' : 's'} deleted`);
    router.refresh();
  }

  async function handleDeleteSelected(): Promise<void> {
    const ids = filtered.filter((j) => selectedIds.has(j.id)).map((j) => j.id);
    if (ids.length === 0) return;

    const confirmed = await confirm({
      title: `Delete ${ids.length} selected job${ids.length === 1 ? '' : 's'}?`,
      description: 'This will permanently remove them and all associated data.',
      confirmText: 'Delete Selected',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setDeletingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });

    await Promise.all(ids.map((id) => deleteJob(id)));

    setSelectedIds(new Set());
    toast.success(`${ids.length} job${ids.length === 1 ? '' : 's'} deleted`);
    router.refresh();
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Status filter chips */}
        <div className="flex items-center gap-1">
          <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            All
          </FilterChip>
          {hasStatuses.active && (
            <FilterChip active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
              Processing
            </FilterChip>
          )}
          {hasStatuses.complete && (
            <FilterChip active={statusFilter === 'complete'} onClick={() => setStatusFilter('complete')}>
              Ready for Review
            </FilterChip>
          )}
          {hasStatuses.failed && (
            <FilterChip active={statusFilter === 'failed'} onClick={() => setStatusFilter('failed')}>
              Failed
            </FilterChip>
          )}
        </div>

        {/* Source type filter */}
        {sourceTypes.length > 1 && (
          <div className="flex items-center gap-1">
            <FilterChip active={sourceFilter === 'all'} onClick={() => setSourceFilter('all')}>
              All types
            </FilterChip>
            {sourceTypes.map((type) => (
              <FilterChip
                key={type}
                active={sourceFilter === type}
                onClick={() => setSourceFilter(type as SourceFilter)}
              >
                {SOURCE_LABELS[type] ?? type}
              </FilterChip>
            ))}
          </div>
        )}

        {/* Result count */}
        {(statusFilter !== 'all' || sourceFilter !== 'all') && (
          <span className="ml-1 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length} of {jobs.length}
          </span>
        )}

        {/* Clear failed button */}
        {failedJobs.length > 0 && (
          <button
            onClick={handleClearFailed}
            className="ml-auto rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors duration-150"
            style={{
              color: 'var(--error)',
              border: '1px solid var(--error-subtle)',
              background: 'var(--bg-base)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--error-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-base)';
            }}
          >
            Clear failed ({failedJobs.length})
          </button>
        )}
      </div>

      {/* Job list with staggered entry */}
      <motion.div
        className="space-y-2"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
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
          const isDeleting = deletingIds.has(job.id);
          const isCancelling = cancellingIds.has(job.id);
          const isSelected = selectedIds.has(job.id);
          const SourceIcon = SOURCE_ICONS[job.sourceType] ?? FileText;

          return (
            <motion.div
              key={job.id}
              variants={itemVariants}
              className="group relative flex items-center gap-4 rounded-lg p-4 transition-all duration-150"
              style={{
                background: isFailed ? 'var(--error-subtle)' : 'var(--bg-surface-1)',
                border: isSelected
                  ? '1px solid var(--accent-primary)'
                  : isFailed
                    ? '1px solid rgba(239,68,68,0.2)'
                    : '1px solid var(--border-default)',
                opacity: isDeleting ? 0.5 : 1,
                pointerEvents: isDeleting ? 'none' : 'auto',
              }}
              onMouseEnter={(e) => {
                if (!isDeleting && !isSelected) {
                  e.currentTarget.style.borderColor = isFailed
                    ? 'rgba(239,68,68,0.3)'
                    : 'var(--border-hover)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = isFailed
                    ? 'rgba(239,68,68,0.2)'
                    : 'var(--border-default)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {/* Checkbox */}
              <button
                onClick={(e) => toggleSelected(e, job.id)}
                className="shrink-0 rounded p-0.5 transition-colors duration-150"
                aria-label={isSelected ? `Deselect ${title}` : `Select ${title}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-surface-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <CheckboxIcon checked={isSelected} />
              </button>

              {/* Clickable row */}
              <Link
                href={href}
                className="flex flex-1 items-center gap-4 min-w-0"
              >
                {/* Source icon container */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: isFailed ? 'var(--error-subtle)' : 'var(--bg-surface-2)',
                  }}
                >
                  <SourceIcon
                    size={16}
                    strokeWidth={1.8}
                    style={{ color: isFailed ? 'var(--error)' : 'var(--text-secondary)' }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span
                      className="truncate text-[16px] font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {title}
                    </span>
                    {demo && <Badge variant="muted">Demo</Badge>}
                  </div>
                  <div
                    className="flex items-center gap-3 text-[13px]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <span>{SOURCE_LABELS[job.sourceType] ?? job.sourceType}</span>
                    {job.sourceDuration != null && job.sourceDuration > 0 && (
                      <>
                        <span style={{ color: 'var(--border-strong)' }}>·</span>
                        <span>{formatDuration(job.sourceDuration)}</span>
                      </>
                    )}
                    <span style={{ color: 'var(--border-strong)' }}>·</span>
                    <span>{timeAgo(new Date(job.createdAt))}</span>
                  </div>

                  {/* Failed job error inline */}
                  {isFailed && (job.error || failedStep) && (
                    <div
                      className="mt-1.5 flex items-center gap-2 text-[13px]"
                      style={{ color: 'var(--error)' }}
                    >
                      <AlertCircle size={12} strokeWidth={2.5} className="shrink-0" />
                      <span className="truncate">
                        {failedStep && <span className="font-semibold">{failedStep}: </span>}
                        {job.error ?? 'Unknown error'}
                      </span>
                    </div>
                  )}
                </div>
              </Link>

              {/* Right side: badges + status + menu */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Output counts */}
                {job.status === 'complete' && (
                  <div className="flex gap-1.5">
                    <Badge variant="green">{job.clipCount} clips</Badge>
                    <Badge variant="cyan">{job.textOutputCount} text</Badge>
                  </div>
                )}

                {/* "Review →" text on hover for complete jobs */}
                {job.status === 'complete' && (
                  <span
                    className="hidden text-[13px] font-medium opacity-0 transition-opacity duration-150 group-hover:inline group-hover:opacity-100"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Review →
                  </span>
                )}

                {/* Status dot + label */}
                <div className="flex items-center gap-1.5">
                  <StatusDot status={getJobStatusDotStatus(job.status)} />
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: getStatusTextColor(job.status) }}
                  >
                    {STATUS_LABELS[job.status] ?? job.status}
                  </span>
                </div>

                {/* Three-dot action menu */}
                <DropdownMenu>
                  <DropdownTrigger>
                    <button
                      className="rounded-md p-1.5 transition-colors duration-150"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-surface-2)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-tertiary)';
                      }}
                      aria-label="Job actions"
                    >
                      <MoreVertical size={16} strokeWidth={2} />
                    </button>
                  </DropdownTrigger>
                  <DropdownContent align="end">
                    <DropdownItem
                      onClick={() => router.push(href)}
                    >
                      View
                    </DropdownItem>
                    {isFailed && (
                      <DropdownItem
                        onClick={(e) => handleRetry(e, job.id)}
                        disabled={isRetrying}
                      >
                        {isRetrying ? 'Retrying...' : 'Retry'}
                      </DropdownItem>
                    )}
                    {isActive && (
                      <DropdownItem
                        onClick={(e) => handleCancel(e, job)}
                        disabled={isCancelling}
                      >
                        {isCancelling ? 'Cancelling...' : 'Cancel'}
                      </DropdownItem>
                    )}
                    <DropdownSeparator />
                    <DropdownItem
                      variant="destructive"
                      onClick={(e) => handleDelete(e, job)}
                      disabled={isDeleting}
                    >
                      Delete
                    </DropdownItem>
                  </DropdownContent>
                </DropdownMenu>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div
            className="py-12 text-center text-[14px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            No jobs match the current filters.
          </div>
        )}
      </motion.div>

      {/* Floating bulk action bar */}
      {visibleSelectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div
            className="flex items-center gap-3 rounded-lg px-4 py-2.5"
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <span
              className="text-[14px] font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {visibleSelectedCount} selected
            </span>
            <div className="h-4 w-px" style={{ background: 'var(--border-default)' }} />
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold text-white transition-colors duration-150"
              style={{ background: 'var(--error)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <Trash2 size={14} strokeWidth={2} />
              Delete selected ({visibleSelectedCount})
            </button>
            <button
              onClick={clearSelection}
              className="rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-surface-1)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Filter Chip ─────────────────────────────────────────────────────

function FilterChip({
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
      className="rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors duration-150"
      style={{
        background: active ? 'var(--accent-subtle)' : 'transparent',
        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--bg-surface-2)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {children}
    </button>
  );
}

// ─── Checkbox Icon ───────────────────────────────────────────────────

function CheckboxIcon({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill="var(--accent-primary)" stroke="var(--accent-primary)" />
        <path d="M4.5 8L7 10.5L11.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill="var(--bg-base)" stroke="var(--border-default)" />
    </svg>
  );
}
