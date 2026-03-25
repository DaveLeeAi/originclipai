// src/components/layout/app-shell.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  minutesUsed?: number;
  minutesLimit?: number;
  plan?: string;
  userEmail?: string;
  userName?: string;
  userAvatarUrl?: string | null;
}

// Lucide-style inline SVG icons
const icons = {
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  list: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
  ),
  key: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
  ),
  link: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
  ),
  fileText: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  ),
};

const NAV_ITEMS = [
  { href: '/new', label: 'New Job', icon: icons.plus },
  { href: '/', label: 'All Jobs', icon: icons.list, exact: true },
  { href: '/schedule', label: 'Schedule', icon: icons.calendar },
];

const SETTINGS_ITEMS = [
  { href: '/settings', label: 'General', icon: icons.settings },
  { href: '/settings/connections', label: 'Connections', icon: icons.link },
  { href: '/settings/api-keys', label: 'API Keys', icon: icons.key },
  { href: '/templates', label: 'Templates', icon: icons.fileText },
];

export function AppShell({ children, minutesUsed = 0, minutesLimit = 30, plan = 'Free', userEmail, userName, userAvatarUrl }: AppShellProps) {
  const pathname = usePathname();
  const usagePct = minutesLimit > 0 ? Math.min(100, Math.round((minutesUsed / minutesLimit) * 100)) : 0;

  return (
    <div className="flex h-screen bg-[#f6f5f2] text-[#1a1a1a]">
      {/* SIDEBAR */}
      <nav className="flex w-[228px] min-w-[228px] flex-col border-r border-[#e4e2dd] bg-white">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#5046e5] to-[#7c3aed] shadow-sm shadow-indigo-500/25">
            <span className="text-xs font-extrabold text-white">O</span>
          </div>
          <span className="text-[15px] font-bold tracking-tight">
            OriginClip<span className="text-[#5046e5]">AI</span>
          </span>
        </div>

        {/* Main nav */}
        <div className="px-2.5 pt-2">
          <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a09e96]">
            Workspace
          </div>
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-all',
                  active
                    ? 'bg-[#5046e5]/[0.06] text-[#4338ca]'
                    : 'text-[#6b6960] hover:bg-[#f0efec]',
                )}
              >
                <span className={cn(active ? 'text-[#5046e5]' : 'text-[#a09e96]')}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Settings nav */}
        <div className="mt-6 px-2.5">
          <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a09e96]">
            Settings
          </div>
          {SETTINGS_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-all',
                  active
                    ? 'bg-[#5046e5]/[0.06] text-[#4338ca]'
                    : 'text-[#6b6960] hover:bg-[#f0efec]',
                )}
              >
                <span className={cn(active ? 'text-[#5046e5]' : 'text-[#a09e96]')}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Usage meter */}
        <div className="mx-2.5 mb-4 rounded-xl border border-[#e4e2dd] bg-[#f6f5f2] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a09e96]">
              Usage
            </span>
            <span className="text-[10px] font-semibold text-[#a09e96]">{plan}</span>
          </div>
          <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-[#e4e2dd]">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                usagePct >= 90 ? 'bg-[#dc2626]' : usagePct >= 70 ? 'bg-[#d97706]' : 'bg-[#5046e5]',
              )}
              style={{ width: `${usagePct}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#6b6960]">
              {minutesUsed}/{minutesLimit} min
            </span>
            {usagePct >= 80 && (
              <Link href="/settings/billing" className="text-[10px] font-bold text-[#5046e5] hover:underline">
                Upgrade
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e4e2dd] bg-white/85 px-6 backdrop-blur-xl">
          <div />
          <Link href="/settings" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-[#f6f5f2]">
            {userEmail && (
              <span className="text-xs text-[#6b6960]">{userName || userEmail}</span>
            )}
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#5046e5] to-[#7c3aed] shadow-sm">
                <span className="text-xs font-bold text-white">
                  {(userName?.[0] || userEmail?.[0] || 'U').toUpperCase()}
                </span>
              </div>
            )}
          </Link>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
