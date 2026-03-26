// src/components/review/clip-detail.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge, ScorePill, SpeakerBadge, PlatformIcon } from '@/components/ui/badge';
import { formatDuration } from '@/lib/utils';
import type { ClipItem } from './clip-list';

interface ClipDetailProps {
  clip: ClipItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onTogglePlatform: (id: string, platform: string) => void;
}

const PLATFORMS = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'linkedin', label: 'LinkedIn' },
];

export function ClipDetail({ clip, onApprove, onReject, onTogglePlatform }: ClipDetailProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <div className="p-7">
      {/* Video preview */}
      <div className="relative mx-auto mb-7 flex aspect-[9/16] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-[#e0ddd7] to-[#ccc9c2] shadow-xl">
        <div className="text-center">
          <svg className="mx-auto mb-2 text-[var(--text-tertiary)] opacity-50" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span className="text-xs text-[var(--text-tertiary)]">Preview · {formatDuration(clip.duration)}</span>
        </div>

        {/* Caption preview */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-5 pt-10">
          <p className="text-center text-base font-extrabold leading-snug text-white drop-shadow-md">
            {clip.hook ? (
              <>
                <span className="rounded bg-[var(--accent-primary)] px-1.5 py-0.5">
                  {clip.hook.split(' ').slice(0, 2).join(' ')}
                </span>{' '}
                {clip.hook.split(' ').slice(2, 6).join(' ')}
              </>
            ) : (
              clip.title.split(' ').slice(0, 6).join(' ')
            )}
          </p>
        </div>
      </div>

      {/* Title + metadata */}
      <h3 className="mb-3 text-lg font-bold leading-snug tracking-tight">
        {clip.title}
      </h3>

      <div className="mb-5 flex flex-wrap gap-2">
        <Badge variant="default">{formatDuration(clip.duration)}</Badge>
        <ScorePill score={clip.score} />
        <SpeakerBadge speaker={clip.speakerLabel} role={clip.speakerRole as 'host' | 'guest' | 'co_host' | 'solo' | 'unknown'} />
      </div>

      {/* Score breakdown */}
      {clip.scoreFactors && (
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-3">
          {[
            { label: 'Coherence', value: clip.scoreFactors.coherence },
            { label: 'Hook', value: clip.scoreFactors.hookStrength },
            { label: 'Clarity', value: clip.scoreFactors.topicClarity },
            { label: 'Energy', value: clip.scoreFactors.emotionalEnergy },
          ].map((factor) => (
            <div key={factor.label} className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted-foreground">{factor.label}</span>
              <span className="font-mono text-xs font-semibold text-foreground">{factor.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="mb-6 flex gap-2">
        <Button
          variant="primary"
          size="md"
          className="flex-1 bg-gradient-to-r from-[var(--success)] to-[#15803d] shadow-green-600/25"
          onClick={() => onApprove(clip.id)}
          disabled={clip.status === 'approved'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {clip.status === 'approved' ? 'Approved' : 'Approve'}
        </Button>
        <Button variant="secondary" size="md" onClick={() => {}}>
          Edit
        </Button>
        <Button
          variant="danger"
          size="md"
          onClick={() => onReject(clip.id)}
          disabled={clip.status === 'rejected'}
        >
          Skip
        </Button>
      </div>

      {/* Schedule to */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
          Schedule to
        </div>
        <div className="flex gap-2">
          {PLATFORMS.map((p) => {
            const active = clip.platforms.includes(p.key);
            return (
              <button
                key={p.key}
                onClick={() => onTogglePlatform(clip.id, p.key)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/[0.06] text-[var(--accent-primary)]'
                    : 'border-border bg-white text-muted-foreground hover:border-[var(--accent-primary)]'
                }`}
              >
                <PlatformIcon platform={p.key} size={14} />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transcript excerpt */}
      {clip.transcriptExcerpt && (
        <div className="mt-5">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
          >
            {showTranscript ? 'Hide transcript' : 'Show transcript excerpt'}
          </button>
          {showTranscript && (
            <div className="mt-2 rounded-xl border border-border bg-background p-4 text-xs leading-relaxed text-muted-foreground">
              {clip.transcriptExcerpt}
            </div>
          )}
        </div>
      )}

      {/* Keyboard hints */}
      <div className="mt-6 flex justify-center gap-4 text-[10px] text-[var(--text-tertiary)]">
        <span><kbd className="rounded border border-border bg-white px-1.5 py-0.5 font-mono">A</kbd> approve</span>
        <span><kbd className="rounded border border-border bg-white px-1.5 py-0.5 font-mono">S</kbd> skip</span>
        <span><kbd className="rounded border border-border bg-white px-1.5 py-0.5 font-mono">→</kbd> next</span>
      </div>
    </div>
  );
}
