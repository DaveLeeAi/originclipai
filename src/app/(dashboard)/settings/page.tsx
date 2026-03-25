'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/toast';
import { createBrowserClient } from '@supabase/ssr';

type CaptionStyle = 'karaoke' | 'boxed' | 'minimal' | 'impact' | 'subtitle';

interface UserProfile {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('karaoke');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const { toast } = useToast();
  const initialLoadDone = useRef(false);

  // Load user profile
  useEffect(() => {
    async function loadUser() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const profile: UserProfile = {
          email: authUser.email ?? '',
          fullName: authUser.user_metadata?.full_name ?? '',
          avatarUrl: authUser.user_metadata?.avatar_url ?? null,
          createdAt: authUser.created_at,
        };
        setUser(profile);
        setNameInput(profile.fullName);
      }
    }
    loadUser();
  }, []);

  async function handleUpdateName(): Promise<void> {
    if (!nameInput.trim()) return;
    setSaving(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error } = await supabase.auth.updateUser({
        data: { full_name: nameInput.trim() },
      });
      if (error) {
        toast.error('Failed to update name');
      } else {
        setUser((prev) => prev ? { ...prev, fullName: nameInput.trim() } : prev);
        setEditingName(false);
        toast.success('Name updated');
      }
    } catch {
      toast.error('Failed to update name');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut(): Promise<void> {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await supabase.auth.signOut();
    window.location.href = '/';
  }

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
        {/* Account */}
        <div className="rounded-2xl border border-[#e4e2dd] bg-white p-5">
          <h2 className="mb-4 text-sm font-bold">Account</h2>
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#5046e5] to-[#7c3aed]">
                    <span className="text-base font-bold text-white">
                      {(user.fullName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateName(); if (e.key === 'Escape') setEditingName(false); }}
                        className="rounded-lg border border-[#e4e2dd] px-3 py-1.5 text-sm outline-none focus:border-[#5046e5]"
                        placeholder="Your name"
                        autoFocus
                      />
                      <button
                        onClick={handleUpdateName}
                        disabled={saving}
                        className="rounded-lg bg-[#5046e5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4038c7] disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingName(false); setNameInput(user.fullName); }}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#6b6960] hover:bg-[#f6f5f2]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#1a1a1a]">
                        {user.fullName || 'No name set'}
                      </p>
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-[10px] font-medium text-[#5046e5] hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-[#6b6960]">{user.email}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-[#a09e96]">Email</label>
                  <p className="text-sm text-[#1a1a1a]">{user.email}</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#a09e96]">Member since</label>
                  <p className="text-sm text-[#1a1a1a]">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-[#e4e2dd] pt-4">
                <a
                  href="/reset-password"
                  className="rounded-lg border border-[#e4e2dd] px-3 py-1.5 text-xs font-medium text-[#6b6960] hover:bg-[#f6f5f2]"
                >
                  Change password
                </a>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg border border-[#dc2626]/20 px-3 py-1.5 text-xs font-medium text-[#dc2626] hover:bg-[#dc2626]/5"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-full bg-[#e4e2dd]" />
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-[#e4e2dd]" />
                <div className="h-3 w-48 animate-pulse rounded bg-[#e4e2dd]" />
              </div>
            </div>
          )}
        </div>

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
          <h2 className="mb-1 text-sm font-bold">Default clip settings</h2>
          <p className="mb-4 text-xs text-[#a09e96]">
            Default values — custom settings coming in a future update
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-[#f6f5f2] px-4 py-3">
              <div className="text-xs text-[#a09e96]">Min duration</div>
              <div className="mt-0.5 text-lg font-bold text-[#1a1a1a]">30<span className="ml-0.5 text-xs font-normal text-[#a09e96]">sec</span></div>
            </div>
            <div className="rounded-xl bg-[#f6f5f2] px-4 py-3">
              <div className="text-xs text-[#a09e96]">Max duration</div>
              <div className="mt-0.5 text-lg font-bold text-[#1a1a1a]">90<span className="ml-0.5 text-xs font-normal text-[#a09e96]">sec</span></div>
            </div>
            <div className="rounded-xl bg-[#f6f5f2] px-4 py-3">
              <div className="text-xs text-[#a09e96]">Target clips</div>
              <div className="mt-0.5 text-lg font-bold text-[#1a1a1a]">15<span className="ml-0.5 text-xs font-normal text-[#a09e96]">clips</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
