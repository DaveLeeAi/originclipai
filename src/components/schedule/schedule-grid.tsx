// src/components/schedule/schedule-grid.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { PlatformIcon, StatusDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/utils';

export interface ScheduleItem {
  id: string;
  type: 'clip' | 'text';
  title: string;
  duration?: number;
  score?: number;
  wordCount?: number;
  platforms: string[];
  scheduledAt?: Date;
  status: 'queued' | 'posting' | 'posted' | 'failed';
  platformPostUrl?: string;
  error?: string;
  textType?: string;
}

interface ScheduleGridProps {
  items: ScheduleItem[];
  onSetTime: (id: string, time: Date) => void;
  onCancel: (id: string) => void;
}

export function ScheduleGrid({ items, onSetTime, onCancel }: ScheduleGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="max-w-xs text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background">
            <svg className="text-[var(--text-tertiary)]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="mb-1 text-sm font-semibold text-foreground">Nothing scheduled yet</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Process a video or article first, then approve clips and text outputs in the review queue to schedule them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <ScheduleCard
          key={item.id}
          item={item}
          onSetTime={onSetTime}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}

// --- INDIVIDUAL CARD ---

function ScheduleCard({
  item,
  onSetTime,
  onCancel,
}: {
  item: ScheduleItem;
  onSetTime: (id: string, time: Date) => void;
  onCancel: (id: string) => void;
}) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const handleSetTime = () => {
    if (!selectedDate || !selectedTime) return;
    const dateTime = new Date(`${selectedDate}T${selectedTime}`);
    onSetTime(item.id, dateTime);
    setShowTimePicker(false);
  };

  return (
    <Card hoverable className="p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        {item.type === 'clip' ? (
          <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-gradient-to-b from-[#e8e6e1] to-[var(--border-hover)]">
            <svg className="text-[var(--text-tertiary)] opacity-50" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        ) : (
          <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
            <svg className="text-[var(--info)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="truncate text-[13px] font-semibold">{item.title}</div>
          <div className="font-mono text-[11px] text-[var(--text-tertiary)]">
            {item.type === 'clip' && item.duration ? formatDuration(item.duration) : null}
            {item.type === 'clip' && item.score ? ` · Score ${item.score}` : null}
            {item.type === 'text' && item.wordCount ? `${item.wordCount} words` : null}
          </div>
        </div>
      </div>

      {/* Platforms */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {item.platforms.map((p) => (
          <div
            key={p}
            className="flex items-center gap-1 rounded-md border border-[var(--accent-primary)]/15 bg-[var(--accent-primary)]/[0.05] px-2 py-1 text-[11px] font-semibold capitalize text-[var(--accent-primary)]"
          >
            <PlatformIcon platform={p} size={12} />
            {p === 'tiktok' ? 'TikTok' : p === 'youtube' ? 'Shorts' : p === 'x' ? 'X' : p}
          </div>
        ))}
      </div>

      {/* Status / time */}
      <div className="flex items-center gap-2 border-t border-[var(--bg-base)] pt-3">
        <StatusDot status={item.status} />
        {item.status === 'posted' && item.platformPostUrl ? (
          <a
            href={item.platformPostUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
          >
            View post →
          </a>
        ) : item.status === 'failed' ? (
          <span className="text-xs text-[var(--error)]">{item.error ?? 'Failed'}</span>
        ) : item.scheduledAt ? (
          <span className="text-xs text-muted-foreground">
            {item.scheduledAt.toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-tertiary)]">Not scheduled</span>
        )}

        <div className="flex-1" />

        {item.status === 'queued' && !item.scheduledAt && (
          <Button
            variant="accent-outline"
            size="sm"
            onClick={() => setShowTimePicker(!showTimePicker)}
          >
            Set time
          </Button>
        )}

        {item.status === 'queued' && item.scheduledAt && (
          <button
            onClick={() => onCancel(item.id)}
            className="text-[11px] font-medium text-[var(--error)] hover:underline"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Time picker */}
      {showTimePicker && (
        <div className="mt-3 flex gap-2 rounded-lg border border-border bg-background p-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 rounded-md border border-border bg-white px-2 py-1.5 text-xs"
            min={new Date().toISOString().split('T')[0]}
          />
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="w-24 rounded-md border border-border bg-white px-2 py-1.5 text-xs"
          />
          <Button size="sm" onClick={handleSetTime} disabled={!selectedDate || !selectedTime}>
            Set
          </Button>
        </div>
      )}
    </Card>
  );
}
