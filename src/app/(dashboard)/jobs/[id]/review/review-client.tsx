// src/app/(dashboard)/jobs/[id]/review/review-client.tsx
'use client';

import { useState, useCallback } from 'react';
import { useJob, useClips, useTextOutputs, useUpdateClip, useRefineText } from '@/lib/hooks/use-jobs';
import { ClipList, type ClipItem } from '@/components/review/clip-list';
import { ClipDetail } from '@/components/review/clip-detail';
import { TextList, TextDetail, type TextItem } from '@/components/review/text-list';
import { useReviewShortcuts } from '@/components/review/use-review-shortcuts';
import { Badge } from '@/components/ui/badge';
import { cn, formatDuration } from '@/lib/utils';
import Link from 'next/link';

interface Props {
  jobId: string;
}

type Tab = 'clips' | 'text';

const SOURCE_LABELS: Record<string, string> = {
  youtube_url: 'YouTube',
  video_url: 'Video URL',
  video_upload: 'Video',
  audio_upload: 'Audio',
  article_url: 'Article',
  pdf_upload: 'PDF',
};

export function ReviewClient({ jobId }: Props) {
  const [tab, setTab] = useState<Tab>('clips');
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const { job, isLoading: jobLoading, error: jobError } = useJob(jobId);
  const { clips, isLoading: clipsLoading, error: clipsError, refresh: refreshClips } = useClips(jobId);
  const { textOutputs, isLoading: textsLoading, error: textsError, refresh: refreshTexts } = useTextOutputs(jobId);
  const { updateClip } = useUpdateClip();
  const { refineText } = useRefineText();

  // Map API data to component types
  const clipItems: ClipItem[] = clips.map((c: { id: string; title: string; startTime: number; endTime: number; duration: number; score: number; primarySpeakerId?: string; speakerRole?: string; status: string; platforms?: string[]; renderStatus?: string; hook?: string; transcriptExcerpt?: string; scoreFactors?: { coherence: number; hookStrength: number; topicClarity: number; emotionalEnergy: number }; socialCaption?: string; hashtags?: string[] }) => ({
    id: c.id,
    title: c.title,
    startTime: c.startTime,
    endTime: c.endTime,
    duration: c.duration,
    score: c.score,
    primarySpeakerId: c.primarySpeakerId ?? '',
    speakerRole: c.speakerRole ?? 'unknown',
    speakerLabel: c.primarySpeakerId ?? 'Speaker',
    status: c.status.toLowerCase() as ClipItem['status'],
    platforms: c.platforms ?? [],
    renderStatus: c.renderStatus ?? 'pending',
    hook: c.hook,
    transcriptExcerpt: c.transcriptExcerpt,
    scoreFactors: c.scoreFactors,
    socialCaption: c.socialCaption,
    hashtags: c.hashtags,
  }));

  const textItems: TextItem[] = textOutputs.map((t: { id: string; type: string; label: string; content: string; wordCount: number; status: string; platform?: string }) => ({
    id: t.id,
    type: t.type,
    label: t.label,
    content: t.content,
    wordCount: t.wordCount,
    status: t.status.toLowerCase(),
    platform: t.platform,
  }));

  const selectedClip = clipItems.find((c) => c.id === selectedClipId) ?? null;
  const selectedText = textItems.find((t) => t.id === selectedTextId) ?? null;

  // Find current index for navigation
  const currentItems = tab === 'clips' ? clipItems : textItems;
  const currentSelectedId = tab === 'clips' ? selectedClipId : selectedTextId;
  const currentIndex = currentItems.findIndex((i) => i.id === currentSelectedId);

  const navigateNext = useCallback(() => {
    if (currentIndex < currentItems.length - 1) {
      const nextId = currentItems[currentIndex + 1].id;
      if (tab === 'clips') { setSelectedClipId(nextId); } else { setSelectedTextId(nextId); }
    }
  }, [currentIndex, currentItems, tab]);

  const navigatePrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevId = currentItems[currentIndex - 1].id;
      if (tab === 'clips') { setSelectedClipId(prevId); } else { setSelectedTextId(prevId); }
    }
  }, [currentIndex, currentItems, tab]);

  const handleApprove = useCallback(async () => {
    if (tab === 'clips' && selectedClipId) {
      await updateClip({ clipId: selectedClipId, status: 'approved' });
      refreshClips();
      navigateNext();
    }
  }, [tab, selectedClipId, updateClip, refreshClips, navigateNext]);

  const handleSkip = useCallback(async () => {
    if (tab === 'clips' && selectedClipId) {
      await updateClip({ clipId: selectedClipId, status: 'rejected' });
      refreshClips();
      navigateNext();
    }
  }, [tab, selectedClipId, updateClip, refreshClips, navigateNext]);

  useReviewShortcuts({
    onApprove: handleApprove,
    onSkip: handleSkip,
    onNext: navigateNext,
    onPrevious: navigatePrev,
    enabled: tab === 'clips' && !!selectedClipId,
  });

  const handleRefineText = async (textId: string, instruction: string): Promise<string> => {
    const result = await refineText({ textId, instruction });
    refreshTexts();
    return result.refinedText;
  };

  const handleSaveText = async (textId: string, content: string): Promise<void> => {
    await fetch(`/api/v1/texts/${textId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    refreshTexts();
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleApproveText = async (textId: string) => {
    try {
      await fetch(`/api/v1/texts/${textId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      refreshTexts();
    } catch (err) {
      console.error('Failed to approve text:', err);
    }
  };

  const handleTogglePlatform = async (clipId: string, platform: string) => {
    const clip = clipItems.find((c) => c.id === clipId);
    if (!clip) return;
    const current = clip.platforms ?? [];
    const updated = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    try {
      await fetch(`/api/v1/clips/${clipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: updated }),
      });
      refreshClips();
    } catch (err) {
      console.error('Failed to toggle platform:', err);
    }
  };

  // Loading state
  if (jobLoading && !job) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#e4e2dd] border-t-[#5046e5]" />
          <p className="text-sm text-[#a09e96]">Loading job...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (jobError || clipsError || textsError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dc2626]/20 bg-[#dc2626]/[0.04]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="mb-2 text-sm font-semibold text-[#dc2626]">Failed to load review data</p>
          <p className="mb-4 text-xs text-[#a09e96]">
            {(jobError ?? clipsError ?? textsError)?.message ?? 'An unexpected error occurred.'}
          </p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e2dd] bg-white px-4 py-2 text-xs font-semibold text-[#6b6960] shadow-sm hover:shadow-md"
          >
            Back to jobs
          </Link>
        </div>
      </div>
    );
  }

  // Approval stats
  const approvedClips = clipItems.filter((c) => c.status === 'approved').length;
  const approvedTexts = textItems.filter((t) => t.status === 'approved').length;

  return (
    <div className="flex h-full flex-col">
      {/* Job header */}
      <div className="border-b border-[#e4e2dd] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/jobs"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e4e2dd] text-[#a09e96] hover:border-[#5046e5] hover:text-[#5046e5]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-tight">
              {job?.sourceTitle ?? 'Untitled job'}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#a09e96]">
              {job?.sourceType && (
                <span>{SOURCE_LABELS[job.sourceType] ?? job.sourceType}</span>
              )}
              {job?.sourceDurationSeconds != null && job.sourceDurationSeconds > 0 && (
                <>
                  <span className="text-[#e4e2dd]">·</span>
                  <span>{formatDuration(job.sourceDurationSeconds)}</span>
                </>
              )}
              {job?.transcript?.speakerCount != null && job.transcript.speakerCount > 0 && (
                <>
                  <span className="text-[#e4e2dd]">·</span>
                  <span>{job.transcript.speakerCount} speakers</span>
                </>
              )}
              {job?.transcript?.wordCount != null && job.transcript.wordCount > 0 && (
                <>
                  <span className="text-[#e4e2dd]">·</span>
                  <span>{job.transcript.wordCount.toLocaleString()} words</span>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {approvedClips > 0 && (
              <Badge variant="green">{approvedClips}/{clipItems.length} clips approved</Badge>
            )}
            {approvedTexts > 0 && (
              <Badge variant="cyan">{approvedTexts}/{textItems.length} text approved</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-[#e4e2dd] bg-white px-6">
        {([
          { key: 'clips' as Tab, label: 'Video Clips', count: clipItems.length },
          { key: 'text' as Tab, label: 'Text Outputs', count: textItems.length },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelectedClipId(null); setSelectedTextId(null); }}
            className={cn(
              'flex items-center gap-2 border-b-2 px-5 py-3.5 text-[13px] font-semibold transition-all',
              tab === t.key
                ? 'border-[#5046e5] text-[#4338ca]'
                : 'border-transparent text-[#6b6960] hover:text-[#1a1a1a]',
            )}
          >
            {t.label}
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold',
                tab === t.key
                  ? 'bg-[#5046e5]/10 text-[#5046e5]'
                  : 'bg-[#f6f5f2] text-[#a09e96]',
              )}
            >
              {t.count}
            </span>
          </button>
        ))}

        <div className="flex-1" />

        <button className="flex items-center gap-1.5 rounded-lg border border-[#e4e2dd] bg-white px-3 py-1.5 text-xs font-semibold text-[#6b6960] shadow-sm hover:shadow-md">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
          Regenerate
        </button>
      </div>

      {/* Content: list + detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — list */}
        <div className="w-[420px] min-w-[420px] border-r border-[#e4e2dd] bg-white">
          {tab === 'clips' ? (
            clipsLoading && clipItems.length === 0 ? (
              <ListSkeleton />
            ) : (
              <ClipList
                clips={clipItems}
                selectedId={selectedClipId}
                onSelect={setSelectedClipId}
              />
            )
          ) : (
            textsLoading && textItems.length === 0 ? (
              <ListSkeleton />
            ) : (
              <TextList
                items={textItems}
                selectedId={selectedTextId}
                onSelect={setSelectedTextId}
              />
            )
          )}
        </div>

        {/* Right panel — detail */}
        <div className="flex-1 overflow-auto bg-[#f6f5f2]">
          {tab === 'clips' && selectedClip ? (
            <ClipDetail
              clip={selectedClip}
              onApprove={(id) => { updateClip({ clipId: id, status: 'approved' }); refreshClips(); }}
              onReject={(id) => { updateClip({ clipId: id, status: 'rejected' }); refreshClips(); }}
              onTogglePlatform={handleTogglePlatform}
            />
          ) : tab === 'text' && selectedText ? (
            <TextDetail
              key={selectedText.id}
              item={selectedText}
              onRefine={handleRefineText}
              onSave={handleSaveText}
              onCopy={handleCopy}
              onApprove={handleApproveText}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-[#a09e96]">
                <svg className="mx-auto mb-3 opacity-30" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  {tab === 'clips' ? (
                    <><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/></>
                  ) : (
                    <><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></>
                  )}
                </svg>
                <p className="text-sm">
                  Select a {tab === 'clips' ? 'clip' : 'text output'} to preview
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Skeleton for the left panel while data loads. */
function ListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-transparent p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-[#e4e2dd]" />
            <div className="h-3 flex-1 rounded bg-[#e4e2dd]" />
            <div className="h-4 w-8 rounded bg-[#e4e2dd]" />
          </div>
          <div className="mb-1.5 h-4 w-3/4 rounded bg-[#e4e2dd]" />
          <div className="h-3 w-1/2 rounded bg-[#e4e2dd]" />
        </div>
      ))}
    </div>
  );
}
