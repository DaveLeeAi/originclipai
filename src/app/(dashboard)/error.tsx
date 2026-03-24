// src/app/(dashboard)/error.tsx
'use client';

import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#dc2626]/20 bg-[#dc2626]/[0.04]">
          <svg className="text-[#dc2626]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-bold">Something went wrong</h2>
        <p className="mb-5 text-sm text-[#6b6960]">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={reset}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => (window.location.href = '/')}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
