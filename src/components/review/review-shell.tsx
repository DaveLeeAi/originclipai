// src/components/review/review-shell.tsx
'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ClipList, type ClipItem } from './clip-list';
import { ClipDetail } from './clip-detail';
import { TextList, TextDetail, type TextItem } from './text-list';
import { useReviewShortcuts } from './use-review-shortcuts';

interface ReviewShellProps {
  jobId: string;
  sourceTitle: string;
  initialClips: (ClipItem & {
    hook?: string;
    transcriptExcerpt?: string;
    scoreFactors?: {
      coherence: number;
      hookStrength: number;
      topicClarity: number;
      emotionalEnergy: number;
    };
  })[];
  initialTexts: TextItem[];
}

type Tab = 'clips' | 'text';

export function ReviewShell({ sourceTitle, initialClips, initialTexts }: ReviewShellProps) {
  const [tab, setTab] = useState<Tab>('clips');
  const [clips, setClips] = useState(initialClips);
  const [texts, setTexts] = useState(initialTexts);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(
    initialClips[0]?.id ?? null,
  );
  const [selectedTextId, setSelectedTextId] = useState<string | null>(
    initialTexts[0]?.id ?? null,
  );

  const selectedClip = clips.find((c) => c.id === selectedClipId) ?? null;
  const selectedText = texts.find((t) => t.id === selectedTextId) ?? null;

  // --- Clip actions ---

  const handleApproveClip = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/v1/clips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (res.ok) {
        setClips((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'approved' as const } : c)),
        );
        // Auto-advance to next clip
        const idx = clips.findIndex((c) => c.id === id);
        if (idx < clips.length - 1) {
          setSelectedClipId(clips[idx + 1].id);
        }
      }
    },
    [clips],
  );

  const handleRejectClip = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/v1/clips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (res.ok) {
        setClips((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'rejected' as const } : c)),
        );
        const idx = clips.findIndex((c) => c.id === id);
        if (idx < clips.length - 1) {
          setSelectedClipId(clips[idx + 1].id);
        }
      }
    },
    [clips],
  );

  const handleTogglePlatform = useCallback(
    (_id: string, platform: string) => {
      setClips((prev) =>
        prev.map((c) => {
          if (c.id !== _id) return c;
          const platforms = c.platforms.includes(platform)
            ? c.platforms.filter((p) => p !== platform)
            : [...c.platforms, platform];
          return { ...c, platforms };
        }),
      );
    },
    [],
  );

  const handleNextClip = useCallback(() => {
    if (!selectedClipId) return;
    const idx = clips.findIndex((c) => c.id === selectedClipId);
    if (idx < clips.length - 1) setSelectedClipId(clips[idx + 1].id);
  }, [clips, selectedClipId]);

  const handlePrevClip = useCallback(() => {
    if (!selectedClipId) return;
    const idx = clips.findIndex((c) => c.id === selectedClipId);
    if (idx > 0) setSelectedClipId(clips[idx - 1].id);
  }, [clips, selectedClipId]);

  // --- Text actions ---

  const handleApproveText = useCallback(async (id: string) => {
    const res = await fetch(`/api/v1/texts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
    if (res.ok) {
      setTexts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'approved' as const } : t)),
      );
    }
  }, []);

  const handleRefineText = useCallback(
    async (id: string, instruction: string): Promise<string> => {
      const res = await fetch(`/api/v1/texts/${id}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      });
      if (!res.ok) throw new Error('Refine failed');
      const data = await res.json();
      setTexts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, content: data.content, wordCount: data.wordCount } : t)),
      );
      return data.content;
    },
    [],
  );

  const handleCopyText = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // --- Keyboard shortcuts (clips tab only) ---

  useReviewShortcuts({
    onApprove: () => {
      if (tab === 'clips' && selectedClipId) handleApproveClip(selectedClipId);
    },
    onSkip: () => {
      if (tab === 'clips' && selectedClipId) handleRejectClip(selectedClipId);
    },
    onNext: handleNextClip,
    onPrevious: handlePrevClip,
    enabled: tab === 'clips',
  });

  const approvedClipCount = clips.filter((c) => c.status === 'approved').length;
  const approvedTextCount = texts.filter((t) => t.status === 'approved').length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-4 border-b border-[#e4e2dd] bg-white px-6 py-3">
        <a href="/" className="text-[#a09e96] hover:text-[#6b6960]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </a>
        <div className="flex-1">
          <h1 className="text-[15px] font-bold tracking-tight">{sourceTitle}</h1>
          <p className="text-[11px] text-[#a09e96]">
            {approvedClipCount} clips approved · {approvedTextCount} texts approved
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-xl border border-[#e4e2dd] bg-[#f6f5f2] p-0.5">
          <button
            onClick={() => setTab('clips')}
            className={cn(
              'rounded-[10px] px-4 py-1.5 text-xs font-bold transition-all',
              tab === 'clips'
                ? 'bg-white text-[#1a1a1a] shadow-sm'
                : 'text-[#a09e96] hover:text-[#6b6960]',
            )}
          >
            Clips ({clips.length})
          </button>
          <button
            onClick={() => setTab('text')}
            className={cn(
              'rounded-[10px] px-4 py-1.5 text-xs font-bold transition-all',
              tab === 'text'
                ? 'bg-white text-[#1a1a1a] shadow-sm'
                : 'text-[#a09e96] hover:text-[#6b6960]',
            )}
          >
            Text ({texts.length})
          </button>
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {tab === 'clips' ? (
          <>
            {/* Left panel — clip list */}
            <div className="w-[340px] shrink-0 overflow-auto border-r border-[#e4e2dd] bg-white">
              <ClipList
                clips={clips}
                selectedId={selectedClipId}
                onSelect={setSelectedClipId}
              />
            </div>
            {/* Right panel — clip detail */}
            <div className="flex-1 overflow-auto bg-[#f6f5f2]">
              {selectedClip ? (
                <ClipDetail
                  clip={selectedClip}
                  onApprove={handleApproveClip}
                  onReject={handleRejectClip}
                  onTogglePlatform={handleTogglePlatform}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#a09e96]">
                  Select a clip to review
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Left panel — text list */}
            <div className="w-[340px] shrink-0 overflow-auto border-r border-[#e4e2dd] bg-white">
              <TextList
                items={texts}
                selectedId={selectedTextId}
                onSelect={setSelectedTextId}
              />
            </div>
            {/* Right panel — text detail */}
            <div className="flex-1 overflow-auto bg-[#f6f5f2]">
              {selectedText ? (
                <TextDetail
                  item={selectedText}
                  onRefine={handleRefineText}
                  onCopy={handleCopyText}
                  onApprove={handleApproveText}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#a09e96]">
                  Select a text output to review
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
