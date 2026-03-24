// src/components/jobs/jobs-list.tsx
'use client';

import Link from 'next/link';
import { Badge, StatusDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDuration, timeAgo } from '@/lib/utils';

export interface JobSummary {
  id: string;
  sourceTitle: string | null;
  sourceType: string;
  sourceDuration: number | null;
  status: string;
  clipCount: number;
  textOutputCount: number;
  createdAt: Date;
  completedAt: Date | null;
}

interface JobsListProps {
  jobs: JobSummary[];
}

const SOURCE_LABELS: Record<string, string> = {
  YOUTUBE_URL: 'YouTube',
  VIDEO_URL: 'Video URL',
  VIDEO_UPLOAD: 'Video',
  AUDIO_UPLOAD: 'Audio',
  ARTICLE_URL: 'Article',
  PDF_UPLOAD: 'PDF',
};

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Queued',
  INGESTING: 'Downloading',
  TRANSCRIBING: 'Transcribing',
  ANALYZING: 'Analyzing',
  RENDERING: 'Rendering',
  COMPLETE: 'Complete',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export function JobsList({ jobs }: JobsListProps) {
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

  return (
    <div className="space-y-2">
      {jobs.map((job) => {
        const isActive = ['CREATED', 'INGESTING', 'TRANSCRIBING', 'ANALYZING', 'RENDERING'].includes(job.status);
        const href = job.status === 'COMPLETE'
          ? `/jobs/${job.id}/review`
          : `/jobs/${job.id}`;

        return (
          <Link
            key={job.id}
            href={href}
            className="flex items-center gap-4 rounded-xl border border-[#e4e2dd] bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-[#d4d2cc]"
          >
            {/* Source type badge */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#e4e2dd] bg-[#f6f5f2]">
              <span className="text-[10px] font-bold text-[#6b6960]">
                {SOURCE_LABELS[job.sourceType]?.slice(0, 3).toUpperCase() ?? '???'}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="mb-0.5 truncate text-sm font-semibold">
                {job.sourceTitle ?? 'Untitled'}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#a09e96]">
                <span>{SOURCE_LABELS[job.sourceType] ?? job.sourceType}</span>
                {job.sourceDuration && (
                  <>
                    <span>·</span>
                    <span>{formatDuration(job.sourceDuration)}</span>
                  </>
                )}
                <span>·</span>
                <span>{timeAgo(new Date(job.createdAt))}</span>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              {job.status === 'COMPLETE' && (
                <div className="flex gap-1.5">
                  <Badge variant="green">{job.clipCount} clips</Badge>
                  <Badge variant="cyan">{job.textOutputCount} text</Badge>
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-lg border border-[#e4e2dd] bg-[#f6f5f2] px-2.5 py-1">
                <StatusDot status={job.status.toLowerCase() as any} />
                <span className={`text-[11px] font-semibold ${isActive ? 'text-[#5046e5]' : 'text-[#6b6960]'}`}>
                  {STATUS_LABELS[job.status] ?? job.status}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
