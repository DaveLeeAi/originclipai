// src/app/(dashboard)/schedule/page.tsx
'use client';

import { useScheduledPosts } from '@/lib/hooks/use-jobs';
import { ScheduleGrid } from '@/components/schedule/schedule-grid';

export default function SchedulePage() {
  const { posts, refresh } = useScheduledPosts();

  const handleSetTime = async (id: string, time: Date) => {
    await fetch(`/api/v1/schedule/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: time.toISOString() }),
    });
    refresh();
  };

  const handleCancel = async (id: string) => {
    await fetch(`/api/v1/schedule/${id}`, { method: 'DELETE' });
    refresh();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Schedule</h1>
        <p className="text-sm text-[#6b6960]">
          {posts.length} items in queue
        </p>
      </div>
      <ScheduleGrid
        items={posts.map((p: any) => ({
          id: p.id,
          type: p.clipId ? 'clip' : 'text',
          title: p.contentTitle ?? 'Untitled',
          platforms: [p.platform],
          scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : undefined,
          status: p.status.toLowerCase(),
          platformPostUrl: p.platformPostUrl,
          error: p.error,
        }))}
        onSetTime={handleSetTime}
        onCancel={handleCancel}
      />
    </div>
  );
}
