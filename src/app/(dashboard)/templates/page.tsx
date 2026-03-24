// src/app/(dashboard)/templates/page.tsx
'use client';

import { usePromptTemplates, useUsage } from '@/lib/hooks/use-jobs';
import { TemplatesManager } from '@/components/settings/templates-manager';

export default function TemplatesPage() {
  const { templates, refresh } = usePromptTemplates();
  const { plan } = useUsage();
  const hasAccess = plan === 'PRO' || plan === 'BUSINESS';

  const handleSave = async (template: { name: string; outputType: string; promptText: string; description?: string }) => {
    await fetch('/api/v1/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    refresh();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/v1/templates/${id}`, { method: 'DELETE' });
    refresh();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch(`/api/v1/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: active }),
    });
    refresh();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Prompt Templates</h1>
        <p className="text-sm text-[#6b6960]">Custom output formats for your content</p>
      </div>
      <div className="max-w-3xl">
        <TemplatesManager
          templates={templates}
          hasAccess={hasAccess}
          onSave={handleSave}
          onDelete={handleDelete}
          onToggle={handleToggle}
        />
      </div>
    </div>
  );
}
