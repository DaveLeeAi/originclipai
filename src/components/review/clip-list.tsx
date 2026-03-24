// src/components/review/clip-list.tsx
'use client';

import { cn, formatDuration } from '@/lib/utils';
import { ScorePill, StatusDot, SpeakerBadge, PlatformIcon } from '@/components/ui/badge';

export interface ClipItem {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  score: number;
  primarySpeakerId: string;
  speakerRole: string;
  speakerLabel: string;
  status: 'review' | 'approved' | 'rejected';
  platforms: string[];
  renderStatus: string;
}

interface ClipListProps {
  clips: ClipItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ClipList({ clips, selectedId, onSelect }: ClipListProps) {
  if (clips.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <div className="mb-2 text-[#a09e96]">
            <svg className="mx-auto" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/>
            </svg>
          </div>
          <p className="text-sm text-[#a09e96]">No clips generated</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-auto p-3">
      {clips.map((clip) => {
        const selected = selectedId === clip.id;

        return (
          <div
            key={clip.id}
            onClick={() => onSelect(clip.id)}
            className={cn(
              'mb-1 flex cursor-pointer gap-3 rounded-xl p-3 transition-all',
              selected
                ? 'border border-[#5046e5]/30 bg-[#5046e5]/[0.03]'
                : 'border border-transparent hover:bg-[#f0efec]',
            )}
          >
            {/* Thumbnail placeholder */}
            <div className="relative flex h-[90px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e4e2dd] bg-gradient-to-b from-[#e8e6e1] to-[#d4d2cc]">
              <svg className="text-[#a09e96] opacity-40" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-px font-mono text-[10px] text-white">
                {formatDuration(clip.duration)}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Status + score */}
              <div className="mb-1 flex items-center gap-1.5">
                <StatusDot status={clip.status} />
                <span className="text-[11px] font-semibold capitalize text-[#a09e96]">
                  {clip.status}
                </span>
                <div className="flex-1" />
                <ScorePill score={clip.score} />
              </div>

              {/* Title */}
              <div className="mb-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-[#1a1a1a]">
                {clip.title}
              </div>

              {/* Speaker + platforms */}
              <div className="flex items-center gap-2">
                <SpeakerBadge
                  speaker={clip.speakerLabel}
                  role={clip.speakerRole as any}
                />
                {clip.platforms.length > 0 && (
                  <div className="flex gap-1">
                    {clip.platforms.map((p) => (
                      <PlatformIcon key={p} platform={p} size={14} className="text-[#a09e96]" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
