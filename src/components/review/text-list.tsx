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

function TextTypeIcon({ type }: { type: string }) {
  const iconClass = 'shrink-0';
  switch (type) {
    case 'linkedin_post':
      return <PlatformIcon platform="linkedin" size={16} className={cn(iconClass, 'text-[var(--accent-primary)]')} />;
    case 'x_thread':
      return <PlatformIcon platform="x" size={16} className={cn(iconClass, 'text-foreground')} />;
    case 'newsletter_section':
      return (
        <svg className={cn(iconClass, 'text-[var(--accent-primary)]')} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22 6 12 13 2 6" />
        </svg>
      );
    case 'key_insight':
      return (
        <svg className={cn(iconClass, 'text-[var(--warning)]')} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case 'notable_quote':
      return (
        <svg className={cn(iconClass, 'text-[#059669]')} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
        </svg>
      );
    case 'summary':
      return (
        <svg className={cn(iconClass, 'text-[var(--accent-primary)]')} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'chapter_markers':
      return (
        <svg className={cn(iconClass, 'text-[var(--accent-primary)]')} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case 'blog_draft':
      return (
        <svg className={cn(iconClass, 'text-[var(--info)]')} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    default:
      return (
        <svg className={cn(iconClass, 'text-[var(--text-tertiary)]')} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      );
  }
}

export function TextList({ items, selectedId, onSelect }: TextListProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background">
            <svg className="text-[var(--text-tertiary)]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
            </svg>
          </div>
          <p className="mb-1 text-sm font-semibold text-foreground">No text outputs yet</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Text outputs like LinkedIn posts, X threads, and summaries will appear here once analysis completes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-auto p-3">
      {items.map((item) => {
        const selected = selectedId === item.id;

        return (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              'mb-1 cursor-pointer rounded-xl p-3.5 transition-all',
              selected
                ? 'border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/[0.03]'
                : 'border border-transparent hover:bg-muted',
            )}
          >
            {/* Header */}
            <div className="mb-2 flex items-center gap-2">
              <TextTypeIcon type={item.type} />
              <span className="text-[13px] font-bold text-foreground">{item.label}</span>
              <div className="flex-1" />
              <StatusDot status={item.status} />
            </div>

            {/* Preview */}
            <div className="mb-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {item.content}
            </div>

            {/* Word count */}
            <div className="font-mono text-[11px] text-[var(--text-tertiary)]">
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
  onSave: (id: string, content: string) => Promise<void>;
  onCopy: (content: string) => void;
  onApprove: (id: string) => void;
}

/** Read-only types that get richer rendering instead of a textarea. */
const READ_ONLY_TYPES = new Set(['key_insight', 'notable_quote', 'chapter_markers']);

export function TextDetail({ item, onRefine, onSave, onCopy, onApprove }: TextDetailProps) {
  const [content, setContent] = useState(item.content);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [showRefine, setShowRefine] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const isReadOnly = READ_ONLY_TYPES.has(item.type);
  const isDirty = content !== item.content;

  const handleRefine = async () => {
    if (!refineInput.trim()) return;
    setIsRefining(true);
    setRefineError(null);
    try {
      const refined = await onRefine(item.id, refineInput);
      setContent(refined);
      setRefineInput('');
      setShowRefine(false);
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : 'Refinement failed. Try again.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await onSave(item.id, content);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    onCopy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Rich rendering for insights
  if (item.type === 'key_insight') {
    return (
      <div className="p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--warning)]/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold tracking-tight">Key Insight</h3>
          <div className="flex-1" />
          <Badge variant="amber">Insight</Badge>
        </div>
        <div className="mb-5 rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning)]/[0.03] p-5">
          <p className="text-sm leading-relaxed text-foreground">{item.content}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="accent-outline"
            size="md"
            onClick={() => onApprove(item.id)}
            disabled={item.status === 'approved'}
          >
            {item.status === 'approved' ? 'Approved' : 'Approve'}
          </Button>
        </div>
      </div>
    );
  }

  // Rich rendering for quotes
  if (item.type === 'notable_quote') {
    return (
      <div className="p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#059669]/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold tracking-tight">Notable Quote</h3>
          <div className="flex-1" />
          <Badge variant="green">Quote</Badge>
        </div>
        <blockquote className="mb-5 rounded-2xl border-l-4 border-[#059669] bg-[#059669]/[0.03] py-5 pl-6 pr-5">
          <p className="text-base font-medium italic leading-relaxed text-foreground">
            &ldquo;{item.content}&rdquo;
          </p>
        </blockquote>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="accent-outline"
            size="md"
            onClick={() => onApprove(item.id)}
            disabled={item.status === 'approved'}
          >
            {item.status === 'approved' ? 'Approved' : 'Approve'}
          </Button>
        </div>
      </div>
    );
  }

  // Rich rendering for chapter markers
  if (item.type === 'chapter_markers') {
    const chapters = item.content.split('\n').filter((line) => line.trim());
    return (
      <div className="p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <h3 className="text-lg font-bold tracking-tight">Chapter Markers</h3>
          <div className="flex-1" />
          <Badge variant="default">{chapters.length} chapters</Badge>
        </div>
        <div className="mb-5 rounded-2xl border border-border bg-white p-1">
          {chapters.map((line, i) => {
            const spaceIdx = line.indexOf(' ');
            const timestamp = spaceIdx > 0 ? line.slice(0, spaceIdx) : '';
            const title = spaceIdx > 0 ? line.slice(spaceIdx + 1) : line;
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-2.5',
                  i % 2 === 0 ? 'bg-background' : 'bg-white',
                )}
              >
                <span className="shrink-0 font-mono text-xs font-semibold text-[var(--accent-primary)]">{timestamp}</span>
                <span className="text-sm text-foreground">{title}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    );
  }

  // Rich rendering for summary
  if (item.type === 'summary') {
    return (
      <div className="p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h3 className="text-lg font-bold tracking-tight">Summary</h3>
          <div className="flex-1" />
          <Badge variant="default">{item.wordCount} words</Badge>
        </div>
        <div className="mb-5 rounded-2xl border border-border bg-white p-5">
          {item.content.split('\n\n').map((paragraph, i) => (
            <p key={i} className={cn('text-sm leading-relaxed text-foreground', i > 0 && 'mt-3')}>
              {paragraph}
            </p>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            variant="accent-outline"
            size="md"
            onClick={() => onApprove(item.id)}
            disabled={item.status === 'approved'}
          >
            {item.status === 'approved' ? 'Approved' : 'Approve'}
          </Button>
        </div>
      </div>
    );
  }

  // Default editable rendering for social posts, newsletters, blog drafts, etc.
  return (
    <div className="p-7">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <h3 className="text-lg font-bold tracking-tight">{item.label}</h3>
        <div className="flex-1" />
        <Badge variant="default">{item.wordCount} words</Badge>
        {item.status === 'approved' && <Badge variant="green">Approved</Badge>}
      </div>

      {/* Editable content */}
      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); setSaveStatus('idle'); }}
        className="mb-1 min-h-[240px] w-full rounded-2xl border border-border bg-white p-5 text-sm leading-relaxed text-foreground shadow-sm outline-none focus:border-[var(--accent-primary)]/40"
        style={{ resize: 'vertical' }}
      />

      {/* Dirty indicator + save */}
      <div className="mb-4 flex items-center gap-2">
        {isDirty && (
          <span className="text-[11px] text-[var(--warning)]">Unsaved changes</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-[11px] text-[var(--success)]">Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-[11px] text-[var(--error)]">Save failed</span>
        )}
        <div className="flex-1" />
        {isDirty && (
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>

      {/* Refine with AI */}
      {showRefine ? (
        <div className="mb-5 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/[0.03] p-4">
          <div className="mb-2 text-xs font-bold text-[var(--accent-primary)]">Refine with AI</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
              placeholder="Make it shorter, add a stronger hook, more casual..."
              className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none placeholder:text-[var(--text-tertiary)]"
              disabled={isRefining}
            />
            <Button size="sm" onClick={handleRefine} disabled={!refineInput.trim() || isRefining}>
              {isRefining ? 'Refining...' : 'Refine'}
            </Button>
          </div>
          {refineError && (
            <p className="mt-2 text-xs text-[var(--error)]">{refineError}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['Make it shorter', 'Stronger hook', 'More professional', 'More casual'].map((q) => (
              <button
                key={q}
                onClick={() => setRefineInput(q)}
                className="rounded-md border border-border bg-white px-2 py-1 text-[11px] text-muted-foreground hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
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
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="accent-outline"
          size="md"
          onClick={() => onApprove(item.id)}
          disabled={item.status === 'approved'}
        >
          {item.status === 'approved' ? 'Approved' : 'Approve'}
        </Button>
      </div>
    </div>
  );
}
