'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/toast';

type CaptionStyle = 'karaoke' | 'boxed' | 'minimal' | 'impact' | 'subtitle';

export default function SettingsPage() {
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('karaoke');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const initialLoadDone = useRef(false);

  // Load current settings
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/settings');
        if (res.ok) {
          const data = await res.json() as { defaultCaptionStyle?: string };
          if (data.defaultCaptionStyle) {
            setCaptionStyle(data.defaultCaptionStyle as CaptionStyle);
          }
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
        initialLoadDone.current = true;
      }
    }
    load();
  }, []);

  async function saveSetting(field: string, value: string): Promise<void> {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        toast.success('Setting saved');
      } else {
        toast.error('Failed to save setting');
      }
    } catch {
      toast.error('Failed to save setting');
    } finally {
      setSaving(false);
    }
  }

  function handleCaptionStyleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as CaptionStyle;
    setCaptionStyle(value);
    saveSetting('defaultCaptionStyle', value);
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        {saving && (
          <span className="text-xs text-[#a09e96]">Saving...</span>
        )}
      </div>
      <div className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-[#e4e2dd] bg-white p-5">
          <h2 className="mb-3 text-sm font-bold">Default caption style</h2>
          <select
            value={captionStyle}
            onChange={handleCaptionStyleChange}
            disabled={loading}
            className="w-full max-w-xs rounded-lg border border-[#e4e2dd] px-3 py-2 text-sm outline-none focus:border-[#5046e5] disabled:opacity-50"
          >
            <option value="karaoke">Karaoke (word-level highlight)</option>
            <option value="boxed">Boxed (background box)</option>
            <option value="minimal">Minimal (top-aligned)</option>
            <option value="impact">Impact (bold, large)</option>
            <option value="subtitle">Subtitle (classic)</option>
          </select>
        </div>
        <div className="rounded-2xl border border-[#e4e2dd] bg-white p-5">
          <h2 className="mb-3 text-sm font-bold">Default clip settings</h2>
          <p className="mb-3 text-xs text-[#a09e96]">
            These defaults are used when creating new jobs. You can override them per job.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-[#6b6960]">Min duration (sec)</label>
              <input
                type="number"
                defaultValue={30}
                min={15}
                max={120}
                disabled
                className="w-full rounded-lg border border-[#e4e2dd] px-3 py-2 text-sm outline-none disabled:bg-[#f6f5f2] disabled:text-[#a09e96]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6b6960]">Max duration (sec)</label>
              <input
                type="number"
                defaultValue={90}
                min={30}
                max={180}
                disabled
                className="w-full rounded-lg border border-[#e4e2dd] px-3 py-2 text-sm outline-none disabled:bg-[#f6f5f2] disabled:text-[#a09e96]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6b6960]">Target clips</label>
              <input
                type="number"
                defaultValue={15}
                min={5}
                max={30}
                disabled
                className="w-full rounded-lg border border-[#e4e2dd] px-3 py-2 text-sm outline-none disabled:bg-[#f6f5f2] disabled:text-[#a09e96]"
              />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[#a09e96]">
            Clip duration settings will be configurable per-profile in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
