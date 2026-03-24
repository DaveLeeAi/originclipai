// src/components/review/text-list.tsx
'use client';

import { cn } from '@/lib/utils';
import { StatusDot, PlatformIcon } from '@/components/ui/badge';

export interface TextItem {
  id: string;
  type: string;
  label: string;
  content: string;
  wordCount: number;
  status: 'draft' | 'approved' | 'scheduled' | 'posted';
  platform?: string;
}

interface TextListProps {
  items: TextItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const typeIcons: Record<string, string> = {
  linkedin_post: 'linkedin',
  x_thread: 'x',
  newsletter_section: 'mail',
  summary: 'summary',
  chapter_markers: 'chapters',
  blog_draft: 'blog',
  key_insight: 'insight',
  notable_quote: 'quote',
  custom: 'custom',
};

export function TextList({ items, selectedId, onSelect }: TextListProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-[#a09e96]">No text outputs generated</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto p-3">
      {items.map((item) => {
        const selected = selectedId === item.id;
        const iconPlatform = typeIcons[item.type] ?? 'custom';

        return (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              'mb-1 cursor-pointer rounded-xl p-3.5 transition-all',
              selected
                ? 'border border-[#5046e5]/30 bg-[#5046e5]/[0.03]'
                : 'border border-transparent hover:bg-[#f0efec]',
            )}
          >
            {/* Header */}
            <div className="mb-2 flex items-center gap-2">
              {(iconPlatform === 'linkedin' || iconPlatform === 'x') && (
                <PlatformIcon platform={iconPlatform} size={16} className="text-[#5046e5]" />
              )}
              {iconPlatform === 'mail' && (
                <svg className="text-[#5046e5]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22 6 12 13 2 6" />
                </svg>
              )}
              {iconPlatform === 'insight' && (
                <svg className="text-[#d97706]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
              {iconPlatform === 'quote' && (
                <svg className="text-[#059669]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
                  <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
                </svg>
              )}
              <span className="text-[13px] font-bold text-[#1a1a1a]">{item.label}</span>
              <div className="flex-1" />
              <StatusDot status={item.status} />
            </div>

            {/* Preview */}
            <div className="mb-2 line-clamp-3 text-xs leading-relaxed text-[#6b6960]">
              {item.content}
            </div>

            {/* Word count */}
            <div className="font-mono text-[11px] text-[#a09e96]">
              {item.wordCount} words
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- TEXT DETAIL ---

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TextDetailProps {
  item: TextItem;
  onRefine: (id: string, instruction: string) => Promise<string>;
  onCopy: (content: string) => void;
  onApprove: (id: string) => void;
}

export function TextDetail({ item, onRefine, onCopy, onApprove }: TextDetailProps) {
  const [content, setContent] = useState(item.content);
  const [isRefining, setIsRefining] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [showRefine, setShowRefine] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRefine = async () => {
    if (!refineInput.trim()) return;
    setIsRefining(true);
    try {
      const refined = await onRefine(item.id, refineInput);
      setContent(refined);
      setRefineInput('');
      setShowRefine(false);
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = () => {
    onCopy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-7">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <h3 className="text-lg font-bold tracking-tight">{item.label}</h3>
        <div className="flex-1" />
        <Badge variant="default">{item.wordCount} words</Badge>
      </div>

      {/* Editable content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="mb-5 min-h-[240px] w-full rounded-2xl border border-[#e4e2dd] bg-white p-5 text-sm leading-relaxed text-[#1a1a1a] shadow-sm outline-none focus:border-[#5046e5]/40"
        style={{ resize: 'vertical' }}
      />

      {/* Refine with AI */}
      {showRefine ? (
        <div className="mb-5 rounded-xl border border-[#5046e5]/20 bg-[#5046e5]/[0.03] p-4">
          <div className="mb-2 text-xs font-bold text-[#5046e5]">Refine with AI</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
              placeholder="Make it shorter, add a stronger hook, more casual..."
              className="flex-1 rounded-lg border border-[#e4e2dd] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a09e96]"
              disabled={isRefining}
            />
            <Button size="sm" onClick={handleRefine} disabled={!refineInput.trim() || isRefining}>
              {isRefining ? 'Refining…' : 'Refine'}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['Make it shorter', 'Stronger hook', 'More professional', 'More casual'].map((q) => (
              <button
                key={q}
                onClick={() => setRefineInput(q)}
                className="rounded-md border border-[#e4e2dd] bg-white px-2 py-1 text-[11px] text-[#6b6960] hover:border-[#5046e5] hover:text-[#5046e5]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="md"
          onClick={() => setShowRefine(!showRefine)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
          {showRefine ? 'Close' : 'Refine with AI'}
        </Button>
        <Button variant="secondary" size="md" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </Button>
        <Button
          variant="accent-outline"
          size="md"
          onClick={() => onApprove(item.id)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Schedule
        </Button>
      </div>
    </div>
  );
}
