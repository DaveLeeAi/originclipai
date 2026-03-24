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
    speakersFound?: number;
    clipsFound?: number;
    textsGenerated?: number;
    clipsRendered?: number;
    clipsTotal?: number;
  };
}

type StepStatus = 'pending' | 'running' | 'complete' | 'error' | 'skipped';

interface ProgressChecklistProps {
  jobId: string;
  sourceTitle?: string;
  isTextOnly?: boolean;
}

const STEPS = [
  { key: 'ingest' as const, label: 'Downloading source', completeLabel: 'Source downloaded' },
  { key: 'transcribe' as const, label: 'Generating transcript', completeLabel: 'Transcript generated' },
  { key: 'analyze' as const, label: 'Scoring clips & drafting text', completeLabel: 'Analysis complete' },
  { key: 'render' as const, label: 'Rendering clips with captions', completeLabel: 'Clips rendered' },
];

export function ProgressChecklist({ jobId, sourceTitle, isTextOnly }: ProgressChecklistProps) {
  const [progress, setProgress] = useState<JobProgress>({
    ingest: 'pending',
    transcribe: 'pending',
    analyze: 'pending',
    render: 'pending',
  });
  const [jobStatus, setJobStatus] = useState<string>('created');
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const router = useRouter();

  useEffect(() => {
    const es = new EventSource(`/api/v1/jobs/${jobId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.progress) {
          setProgress(data.progress);
        }
        if (data.status) {
          setJobStatus(data.status);

          if (data.status === 'complete') {
            es.close();
            // Short delay before redirect so user sees "complete" state
            setTimeout(() => {
              router.push(`/jobs/${jobId}/review`);
            }, 1500);
          }

          if (data.status === 'failed') {
            es.close();
            setError(data.error ?? 'Processing failed');
          }
        }
      } catch {
        // Ignore parse errors from SSE
      }
    };

    es.onerror = () => {
      // SSE reconnects automatically. If job is done, we've already closed.
    };

    return () => {
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
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#5046e5]/20 bg-[#5046e5]/[0.06]">
          <svg
            className={cn('text-[#5046e5]', !allComplete && !error && 'animate-pulse')}
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
          <p className="mb-1 text-sm font-medium text-[#1a1a1a]">{sourceTitle}</p>
        )}

        <p className="mb-8 text-sm text-[#a09e96]">
          {error
            ? 'Something went wrong. You can retry this job.'
            : allComplete
              ? 'Redirecting to review…'
              : 'This usually takes 3-5 minutes for a 60-minute video.'}
        </p>

        {/* Checklist */}
        <div className="mx-auto max-w-[340px] rounded-2xl border border-[#e4e2dd] bg-white p-5 shadow-sm">
          {visibleSteps.map((step, i) => {
            const status = progress[step.key];
            const detail = getStepDetail(step.key, progress);

            return (
              <div
                key={step.key}
                className={cn(
                  'flex items-center gap-3 py-2.5',
                  i < visibleSteps.length - 1 && 'border-b border-[#f6f5f2]',
                )}
              >
                <StepIcon status={status} />
                <div className="flex-1 text-left">
                  <span
                    className={cn(
                      'text-[13px]',
                      status === 'complete' ? 'font-semibold text-[#1a1a1a]' : 'text-[#6b6960]',
                      status === 'pending' && 'text-[#a09e96]',
                      status === 'error' && 'text-[#dc2626]',
                    )}
                  >
                    {status === 'complete' ? step.completeLabel : step.label}
                  </span>
                  {detail && (
                    <span className="ml-1.5 font-mono text-[11px] text-[#a09e96]">{detail}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-6">
            <div className="mb-4 rounded-xl border border-[#dc2626]/20 bg-[#dc2626]/[0.04] px-4 py-3 text-sm text-[#dc2626]">
              {error}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-[#e4e2dd] bg-white px-6 py-2.5 text-sm font-bold shadow-sm hover:shadow-md"
            >
              Retry
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
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#16a34a]/10">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5046e5]/10">
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#5046e5]" />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#dc2626]/10">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
    );
  }
  // pending
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#e4e2dd]">
      <div className="h-1.5 w-1.5 rounded-full bg-[#e4e2dd]" />
    </div>
  );
}

function getStepDetail(key: string, progress: JobProgress): string | null {
  const d = progress.details;
  if (!d) return null;

  switch (key) {
    case 'transcribe':
      return d.speakersFound ? `(${d.speakersFound} speakers)` : null;
    case 'analyze':
      if (d.clipsFound && d.textsGenerated) {
        return `(${d.clipsFound} clips, ${d.textsGenerated} texts)`;
      }
      return d.clipsFound ? `(${d.clipsFound} clips)` : null;
    case 'render':
      if (d.clipsRendered !== undefined && d.clipsTotal) {
        return `(${d.clipsRendered}/${d.clipsTotal})`;
      }
      return null;
    default:
      return null;
  }
}
