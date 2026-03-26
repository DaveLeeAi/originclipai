// src/app/(dashboard)/jobs/[id]/review/error.tsx
'use client';

import { Button } from '@/components/ui/button';

export default function ReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--error)]/20 bg-[var(--error)]/[0.04]">
          <svg className="text-[var(--error)]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-bold">Failed to load review</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred while loading the review queue.'}
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => (window.location.href = '/jobs')}>
            Back to jobs
          </Button>
        </div>
      </div>
    </div>
  );
}
