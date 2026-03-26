// src/components/schedule/schedule-page-client.tsx
'use client';

import { useState } from 'react';
import { ScheduleGrid, type ScheduleItem } from './schedule-grid';

interface SchedulePageClientProps {
  initialItems: ScheduleItem[];
}

export function SchedulePageClient({ initialItems }: SchedulePageClientProps) {
  const [items, setItems] = useState(initialItems);

  const handleSetTime = async (id: string, time: Date) => {
    const res = await fetch(`/api/v1/schedule/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: time.toISOString() }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, scheduledAt: time } : item)),
      );
    }
  };

  const handleCancel = async (id: string) => {
    const res = await fetch(`/api/v1/schedule/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          {items.filter((i) => i.status === 'queued').length} queued ·{' '}
          {items.filter((i) => i.status === 'posted').length} posted
        </p>
      </div>
      <ScheduleGrid items={items} onSetTime={handleSetTime} onCancel={handleCancel} />
    </div>
  );
}
