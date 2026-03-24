'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dc2626]/20 bg-[#dc2626]/[0.06]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-bold tracking-tight">Something went wrong</h2>
        <p className="mb-4 text-sm text-[#6b6960]">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="rounded-xl border border-[#e4e2dd] bg-white px-6 py-2.5 text-sm font-bold shadow-sm hover:shadow-md"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
