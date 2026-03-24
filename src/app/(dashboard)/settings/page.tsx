'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const [captionStyle, setCaptionStyle] = useState('karaoke');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultCaptionStyle: captionStyle }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mb-8 text-sm text-[#6b6960]">General preferences for your account.</p>

      <div className="max-w-[560px] rounded-2xl border border-[#e4e2dd] bg-white p-6 shadow-sm">
        {/* Caption style */}
        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-[#a09e96]">
            Default caption style
          </label>
          <select
            value={captionStyle}
            onChange={(e) => setCaptionStyle(e.target.value)}
            className="w-full rounded-xl border border-[#e4e2dd] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#5046e5]/40"
          >
            <option value="karaoke">Karaoke (word-by-word highlight)</option>
            <option value="subtitle">Subtitle (block text)</option>
            <option value="minimal">Minimal (bottom bar)</option>
          </select>
          <p className="mt-1.5 text-xs text-[#a09e96]">
            Applied to all new clips. You can override per-clip in the review queue.
          </p>
        </div>

        <Button size="md" onClick={handleSave} disabled={saving}>
          {saved ? 'Saved' : saving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
