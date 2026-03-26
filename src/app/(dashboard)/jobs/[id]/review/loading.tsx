// src/app/(dashboard)/jobs/[id]/review/loading.tsx

import { CardSkeleton } from '@/components/shared/error-boundary';

export default function ReviewLoading() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="mb-2 h-5 w-32 animate-pulse rounded bg-[var(--border-default)]" />
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--border-default)]" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="lg:col-span-2">
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
