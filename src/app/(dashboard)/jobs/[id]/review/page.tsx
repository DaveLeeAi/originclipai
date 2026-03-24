// src/app/(dashboard)/jobs/[id]/review/page.tsx
'use client';

import { useState, useCallback, use } from 'react';
import { useClips, useTextOutputs, useUpdateClip, useRefineText } from '@/lib/hooks/use-jobs';
import { ClipList, type ClipItem } from '@/components/review/clip-list';
import { ClipDetail } from '@/components/review/clip-detail';
import { TextList, TextDetail, type TextItem } from '@/components/review/text-list';
import { useReviewShortcuts } from '@/components/review/use-review-shortcuts';
import { cn } from '@/lib/utils';

interface Props {
  params: Promise<{ id: string }>;
}

type Tab = 'clips' | 'text';

export default function ReviewPage({ params }: Props) {
  const { id: jobId } = use(params);
  const [tab, setTab] = useState<Tab>('clips');
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const { clips, refresh: refreshClips } = useClips(jobId);
  const { textOutputs, refresh: refreshTexts } = useTextOutputs(jobId);
  const { updateClip } = useUpdateClip();
  const { refineText } = useRefineText();

  // Map API data to component types
  const clipItems: ClipItem[] = clips.map((c: any) => ({
    id: c.id,
    title: c.title,
    startTime: c.startTime,
    endTime: c.endTime,
    duration: c.duration,
    score: c.score,
    primarySpeakerId: c.primarySpeakerId ?? '',
    speakerRole: c.speakerRole ?? 'unknown',
    speakerLabel: c.primarySpeakerId ?? 'Speaker',
    status: c.status.toLowerCase(),
    platforms: c.platforms ?? [],
    renderStatus: c.renderStatus ?? 'pending',
  }));

  const textItems: TextItem[] = textOutputs.map((t: any) => ({
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
      tab === 'clips' ? setSelectedClipId(nextId) : setSelectedTextId(nextId);
    }
  }, [currentIndex, currentItems, tab]);

  const navigatePrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevId = currentItems[currentIndex - 1].id;
      tab === 'clips' ? setSelectedClipId(prevId) : setSelectedTextId(prevId);
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

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleApproveText = (textId: string) => {
    // TODO: wire to API
  };

  const handleTogglePlatform = (clipId: string, platform: string) => {
    // TODO: wire to API
  };

  return (
    <div className="flex h-full flex-col">
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
            <ClipList
              clips={clipItems}
              selectedId={selectedClipId}
              onSelect={setSelectedClipId}
            />
          ) : (
            <TextList
              items={textItems}
              selectedId={selectedTextId}
              onSelect={setSelectedTextId}
            />
          )}
        </div>

        {/* Right panel — detail */}
        <div className="flex-1 overflow-auto bg-[#f6f5f2]">
          {tab === 'clips' && selectedClip ? (
            <ClipDetail
              clip={{
                ...selectedClip,
                speakerLabel: selectedClip.speakerLabel,
              }}
              onApprove={(id) => { updateClip({ clipId: id, status: 'approved' }); refreshClips(); }}
              onReject={(id) => { updateClip({ clipId: id, status: 'rejected' }); refreshClips(); }}
              onTogglePlatform={handleTogglePlatform}
            />
          ) : tab === 'text' && selectedText ? (
            <TextDetail
              item={selectedText}
              onRefine={handleRefineText}
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
