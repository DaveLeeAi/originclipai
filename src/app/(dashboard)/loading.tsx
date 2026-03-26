// src/app/(dashboard)/loading.tsx

import { CardSkeleton } from '@/components/shared/error-boundary';

export default function DashboardLoading() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="mb-2 h-5 w-24 animate-pulse rounded bg-[var(--border-default)]" />
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--border-default)]" />
      </div>
      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
