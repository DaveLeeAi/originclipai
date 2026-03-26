// src/components/processing/progress-checklist.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface JobProgress {
  ingest: StepStatus;
  transcribe: StepStatus;
  analyze: StepStatus;
  render: StepStatus;
  details?: {
    speakers_found?: number;
    clipsFound?: number;
    textsGenerated?: number;
    insightsExtracted?: number;
    quotesExtracted?: number;
    clips_rendered?: number;
    clips_total?: number;
  };
}

type StepStatus = 'pending' | 'running' | 'complete' | 'error' | 'skipped';

interface ProgressChecklistProps {
  jobId: string;
  sourceTitle?: string;
  isTextOnly?: boolean;
  initialStatus?: string;
  initialError?: string;
}

const STEPS = [
  { key: 'ingest' as const, label: 'Downloading source', completeLabel: 'Source downloaded' },
  { key: 'transcribe' as const, label: 'Generating transcript', completeLabel: 'Transcript generated' },
  { key: 'analyze' as const, label: 'Scoring clips & drafting text', completeLabel: 'Analysis complete' },
  { key: 'render' as const, label: 'Rendering clips with captions', completeLabel: 'Clips rendered' },
];

export function ProgressChecklist({ jobId, sourceTitle, isTextOnly, initialStatus, initialError }: ProgressChecklistProps) {
  const [progress, setProgress] = useState<JobProgress>({
    ingest: 'pending',
    transcribe: 'pending',
    analyze: 'pending',
    render: 'pending',
  });
  const [, setJobStatus] = useState<string>(initialStatus ?? 'created');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const router = useRouter();

  useEffect(() => {
    // If already failed, don't bother connecting to SSE
    if (initialStatus === 'failed') return;

    const es = new EventSource(`/api/v1/jobs/${jobId}/stream`);
    eventSourceRef.current = es;

    // Handle named SSE events from the stream endpoint
    const handleProgressEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress) {
          setProgress({
            ingest: data.progress.ingest ?? 'pending',
            transcribe: data.progress.transcribe ?? 'pending',
            analyze: data.progress.analyze ?? 'pending',
            render: data.progress.render ?? 'pending',
            details: data.progress.details ?? {},
          });
        }
        if (data.status) setJobStatus(data.status);
        if (data.error) setError(data.error);
      } catch {
        // Ignore parse errors
      }
    };

    const handleDoneEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const status = data.status ?? 'complete';
        setJobStatus(status);
        es.close();
        if (status === 'complete') {
          setTimeout(() => {
            router.push(`/jobs/${jobId}/review`);
          }, 1500);
        }
      } catch {
        // Ignore parse errors
      }
    };

    const handleErrorEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setError(data.message ?? 'Processing failed');
        setJobStatus('failed');
        es.close();
      } catch {
        // Ignore parse errors
      }
    };

    es.addEventListener('progress', handleProgressEvent);
    es.addEventListener('done', handleDoneEvent);
    es.addEventListener('error', handleErrorEvent);

    // Fallback: also handle unnamed messages (generic onmessage)
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress) setProgress(data.progress);
        if (data.status) {
          setJobStatus(data.status);
          if (data.status === 'complete') {
            es.close();
            setTimeout(() => router.push(`/jobs/${jobId}/review`), 1500);
          }
          if (data.status === 'failed') {
            es.close();
            setError(data.error ?? 'Processing failed');
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    // Stale-job detector: if no progress update within 30s, poll the REST API
    // This catches the case where workers aren't running or SSE is broken
    const staleTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/jobs/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'complete') {
          es.close();
          router.push(`/jobs/${jobId}/review`);
        } else if (data.status === 'failed') {
          es.close();
          setError(data.error ?? 'Processing failed');
          setJobStatus('failed');
        } else if (data.status === 'created') {
          setError('Job is queued but no worker has picked it up yet. Make sure workers are running: npm run workers:dev');
        }
        // If still processing, update progress from REST API as fallback
        if (data.progress) {
          setProgress({
            ingest: data.progress.ingest ?? 'pending',
            transcribe: data.progress.transcribe ?? 'pending',
            analyze: data.progress.analyze ?? 'pending',
            render: data.progress.render ?? 'pending',
            details: data.progress.details ?? {},
          });
        }
      } catch {
        // Ignore REST fallback errors
      }
    }, 30_000);

    return () => {
      clearTimeout(staleTimer);
      es.close();
    };
  }, [jobId, router]);

  const visibleSteps = isTextOnly
    ? STEPS.filter((s) => s.key !== 'transcribe' && s.key !== 'render')
    : STEPS;

  const allComplete = visibleSteps.every(
    (s) => progress[s.key] === 'complete' || progress[s.key] === 'skipped',
  );

  return (
    <div className="flex flex-1 items-center justify-center p-10">
      <div className="w-full max-w-[480px] text-center">
        {/* Pulsing icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/[0.06]">
          <svg
            className={cn('text-[var(--accent-primary)]', !allComplete && !error && 'animate-pulse')}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
        </div>

        <h2 className="mb-2 text-2xl font-bold tracking-tight">
          {error ? 'Processing failed' : allComplete ? 'Ready for review' : 'Analyzing your content'}
        </h2>

        {sourceTitle && (
          <p className="mb-1 text-sm font-medium text-foreground">{sourceTitle}</p>
        )}

        <p className="mb-8 text-sm text-[var(--text-tertiary)]">
          {error
            ? 'Something went wrong. You can retry this job.'
            : allComplete
              ? 'Redirecting to review…'
              : 'This usually takes 3-5 minutes for a 60-minute video.'}
        </p>

        {/* Checklist */}
        <div className="mx-auto max-w-[340px] rounded-2xl border border-border bg-white p-5 shadow-sm">
          {visibleSteps.map((step, i) => {
            const status = progress[step.key];
            const detail = getStepDetail(step.key, progress);

            return (
              <div
                key={step.key}
                className={cn(
                  'flex items-center gap-3 py-2.5',
                  i < visibleSteps.length - 1 && 'border-b border-[var(--bg-base)]',
                )}
              >
                <StepIcon status={status} />
                <div className="flex-1 text-left">
                  <span
                    className={cn(
                      'text-[13px]',
                      status === 'complete' ? 'font-semibold text-foreground' : 'text-muted-foreground',
                      status === 'pending' && 'text-[var(--text-tertiary)]',
                      status === 'error' && 'text-[var(--error)]',
                    )}
                  >
                    {status === 'complete' ? step.completeLabel : step.label}
                  </span>
                  {detail && (
                    <span className="ml-1.5 font-mono text-[11px] text-[var(--text-tertiary)]">{detail}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-6">
            <div className="mb-4 rounded-xl border border-[var(--error)]/20 bg-[var(--error)]/[0.04] px-4 py-3 text-left text-sm text-[var(--error)]">
              {error}
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`/api/v1/jobs/${jobId}/retry`, { method: 'POST' });
                  if (res.ok) {
                    setError(null);
                    setProgress({ ingest: 'pending', transcribe: 'pending', analyze: 'pending', render: 'pending' });
                    setJobStatus('created');
                    // Reconnect SSE by forcing remount via reload
                    window.location.reload();
                  } else {
                    const data = await res.json();
                    setError(data.error ?? 'Retry failed');
                  }
                } catch {
                  setError('Network error — could not retry');
                }
              }}
              className="rounded-xl border border-border bg-white px-6 py-2.5 text-sm font-bold shadow-sm hover:shadow-md"
            >
              Retry job
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- HELPERS ---

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'complete') {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--success)]/10">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/10">
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent-primary)]" />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--error)]/10">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
    );
  }
  // pending
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border">
      <div className="h-1.5 w-1.5 rounded-full bg-[var(--border-default)]" />
    </div>
  );
}

function getStepDetail(key: string, progress: JobProgress): string | null {
  const d = progress.details;
  if (!d) return null;

  switch (key) {
    case 'transcribe':
      return d.speakers_found ? `(${d.speakers_found} speakers)` : null;
    case 'analyze': {
      const parts: string[] = [];
      if (d.clipsFound) parts.push(`${d.clipsFound} clips`);
      if (d.textsGenerated) parts.push(`${d.textsGenerated} texts`);
      if (d.insightsExtracted) parts.push(`${d.insightsExtracted} insights`);
      if (d.quotesExtracted) parts.push(`${d.quotesExtracted} quotes`);
      return parts.length > 0 ? `(${parts.join(', ')})` : null;
    }
    case 'render':
      if (d.clips_rendered !== undefined && d.clips_total) {
        return `(${d.clips_rendered}/${d.clips_total})`;
      }
      return null;
    default:
      return null;
  }
}
