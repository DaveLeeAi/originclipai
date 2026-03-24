'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PromptTemplate {
  id: string;
  name: string;
  outputType: string;
  promptText: string;
  description: string | null;
  isActive: boolean;
  usageCount: number;
}

const OUTPUT_TYPES = [
  { value: 'linkedin_post', label: 'LinkedIn Post' },
  { value: 'x_thread', label: 'X Thread' },
  { value: 'newsletter_section', label: 'Newsletter' },
  { value: 'summary', label: 'Summary' },
  { value: 'blog_draft', label: 'Blog Draft' },
  { value: 'show_notes', label: 'Show Notes' },
  { value: 'custom', label: 'Custom' },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [outputType, setOutputType] = useState('custom');
  const [promptText, setPromptText] = useState('');

  useEffect(() => {
    fetch('/api/v1/templates')
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data.templates ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !promptText.trim()) return;
    const res = await fetch('/api/v1/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, outputType, promptText }),
    });
    if (res.ok) {
      const data = await res.json();
      setTemplates((prev) => [data.template, ...prev]);
      setName('');
      setPromptText('');
      setShowCreate(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/v1/templates/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prompt Templates</h1>
          <p className="text-sm text-[#6b6960]">
            Custom prompts for text generation. Applied during the analyze step.
          </p>
        </div>
        <Button size="md" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Template'}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 max-w-[640px] rounded-2xl border border-[#e4e2dd] bg-white p-6 shadow-sm">
          <div className="mb-4 flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-bold text-[#a09e96]">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My LinkedIn Style"
                className="w-full rounded-xl border border-[#e4e2dd] bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#a09e96] focus:border-[#5046e5]/40"
              />
            </div>
            <div className="w-[180px]">
              <label className="mb-1 block text-xs font-bold text-[#a09e96]">Output type</label>
              <select
                value={outputType}
                onChange={(e) => setOutputType(e.target.value)}
                className="w-full rounded-xl border border-[#e4e2dd] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#5046e5]/40"
              >
                {OUTPUT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="mb-1 block text-xs font-bold text-[#a09e96]">Prompt</label>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Write a LinkedIn post that... Use the transcript to..."
            rows={5}
            className="mb-4 w-full rounded-xl border border-[#e4e2dd] bg-white px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-[#a09e96] focus:border-[#5046e5]/40"
            style={{ resize: 'vertical' }}
          />
          <Button size="md" onClick={handleCreate} disabled={!name.trim() || !promptText.trim()}>
            Create template
          </Button>
        </div>
      )}

      {/* Template list */}
      <div className="max-w-[640px] space-y-3">
        {loading ? (
          <p className="text-sm text-[#a09e96]">Loading templates...</p>
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-[#e4e2dd] bg-white p-8 text-center shadow-sm">
            <svg className="mx-auto mb-3 text-[#a09e96] opacity-40" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-sm text-[#6b6960]">No custom templates yet</p>
            <p className="text-xs text-[#a09e96]">Create your first template to customize AI outputs.</p>
          </div>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-[#e4e2dd] bg-white p-5 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[13px] font-bold">{t.name}</span>
                <Badge variant="accent">
                  {OUTPUT_TYPES.find((o) => o.value === t.outputType)?.label ?? t.outputType}
                </Badge>
                <div className="flex-1" />
                <span className="font-mono text-[11px] text-[#a09e96]">
                  {t.usageCount} uses
                </span>
              </div>
              <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[#6b6960]">
                {t.promptText}
              </p>
              <button
                onClick={() => handleDelete(t.id)}
                className="text-[11px] font-semibold text-[#dc2626] hover:underline"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
