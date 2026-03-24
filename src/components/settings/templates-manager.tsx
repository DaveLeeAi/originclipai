// src/components/settings/templates-manager.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface PromptTemplateItem {
  id: string;
  name: string;
  outputType: string;
  promptText: string;
  description?: string;
  usageCount: number;
  isActive: boolean;
}

interface TemplatesManagerProps {
  templates: PromptTemplateItem[];
  hasAccess: boolean;
  onSave: (template: { name: string; outputType: string; promptText: string; description?: string }) => Promise<void>;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}

const OUTPUT_TYPES = [
  { value: 'LINKEDIN_POST', label: 'LinkedIn Post' },
  { value: 'X_THREAD', label: 'X Thread' },
  { value: 'NEWSLETTER_SECTION', label: 'Newsletter Section' },
  { value: 'BLOG_DRAFT', label: 'Blog Draft' },
  { value: 'CUSTOM', label: 'Custom Output' },
];

export function TemplatesManager({
  templates,
  hasAccess,
  onSave,
  onDelete,
  onToggle,
}: TemplatesManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    outputType: 'CUSTOM',
    promptText: '',
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!hasAccess) {
    return (
      <Card className="p-8 text-center">
        <h3 className="mb-2 text-base font-bold">Custom prompts require Pro or Business</h3>
        <p className="mb-5 text-sm text-[#6b6960]">
          Define your own output formats — brand-specific LinkedIn templates, custom newsletter styles, or any text format you need.
        </p>
        <Button>Upgrade to Pro</Button>
      </Card>
    );
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.promptText.trim()) return;
    setIsSaving(true);
    try {
      await onSave(form);
      setForm({ name: '', outputType: 'CUSTOM', promptText: '', description: '' });
      setShowCreate(false);
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (template: PromptTemplateItem) => {
    setForm({
      name: template.name,
      outputType: template.outputType,
      promptText: template.promptText,
      description: template.description ?? '',
    });
    setEditingId(template.id);
    setShowCreate(true);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Prompt templates</h3>
          <p className="text-xs text-[#a09e96]">
            Custom output formats run alongside default outputs for every job.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { setShowCreate(!showCreate); setEditingId(null); setForm({ name: '', outputType: 'CUSTOM', promptText: '', description: '' }); }}>
          + New template
        </Button>
      </div>

      {/* Create/Edit form */}
      {showCreate && (
        <Card className="mb-5 p-5">
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6b6960]">Template name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., My LinkedIn Style"
                className="w-full rounded-lg border border-[#e4e2dd] px-3 py-2 text-sm outline-none focus:border-[#5046e5]/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6b6960]">Output type</label>
              <select
                value={form.outputType}
                onChange={(e) => setForm({ ...form, outputType: e.target.value })}
                className="w-full rounded-lg border border-[#e4e2dd] px-3 py-2 text-sm outline-none"
              >
                {OUTPUT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-[#6b6960]">
              Prompt instructions
            </label>
            <textarea
              value={form.promptText}
              onChange={(e) => setForm({ ...form, promptText: e.target.value })}
              placeholder="Write the instructions for generating this output. You can reference {source_title}, {speakers}, and {content} as variables..."
              className="min-h-[120px] w-full resize-y rounded-lg border border-[#e4e2dd] px-3 py-2 text-sm outline-none focus:border-[#5046e5]/40"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-[#6b6960]">
              Description (optional)
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What this template produces"
              className="w-full rounded-lg border border-[#e4e2dd] px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!form.name.trim() || !form.promptText.trim() || isSaving}>
              {isSaving ? 'Saving…' : editingId ? 'Update template' : 'Create template'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setEditingId(null); }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Templates list */}
      {templates.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-[#a09e96]">No custom templates yet. Create one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <Card key={template.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{template.name}</span>
                    <Badge variant={template.isActive ? 'green' : 'muted'}>
                      {template.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                    <Badge variant="default">
                      {OUTPUT_TYPES.find(t => t.value === template.outputType)?.label ?? template.outputType}
                    </Badge>
                  </div>
                  {template.description && (
                    <p className="mt-0.5 text-xs text-[#a09e96]">{template.description}</p>
                  )}
                  <p className="mt-1 font-mono text-[11px] text-[#a09e96]">
                    Used {template.usageCount} times
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggle(template.id, !template.isActive)}
                  >
                    {template.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#dc2626]"
                    onClick={() => onDelete(template.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
