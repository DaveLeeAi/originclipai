// src/components/layout/app-shell.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Plus,
  List,
  Calendar,
  Settings,
  Key,
  Link2,
  FileText,
  CreditCard,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  minutesUsed?: number;
  minutesLimit?: number;
  plan?: string;
  userEmail?: string;
  userName?: string;
  userAvatarUrl?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/new', label: 'New Job', icon: Plus },
  { href: '/', label: 'All Jobs', icon: List, exact: true },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
];

const SETTINGS_ITEMS: NavItem[] = [
  { href: '/settings', label: 'General', icon: Settings },
  { href: '/settings/connections', label: 'Connections', icon: Link2 },
  { href: '/settings/api-keys', label: 'API Keys', icon: Key },
  { href: '/settings/billing', label: 'Billing', icon: CreditCard },
  { href: '/templates', label: 'Templates', icon: FileText },
];

export function AppShell({
  children,
  minutesUsed = 0,
  minutesLimit = 30,
  plan = 'Free',
  userEmail,
  userName,
  userAvatarUrl,
}: AppShellProps) {
  const pathname = usePathname();
  const usagePct = minutesLimit > 0 ? Math.min(100, Math.round((minutesUsed / minutesLimit) * 100)) : 0;

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* SIDEBAR */}
      <nav
        className="flex w-[240px] min-w-[240px] flex-col"
        style={{
          background: 'var(--bg-surface-1)',
          borderRight: '1px solid var(--border-default)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-4">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: 'var(--accent-primary)' }}
          >
            <span className="text-xs font-extrabold text-white">O</span>
          </div>
          <span className="text-[15px] font-bold tracking-tight">
            OriginClip<span style={{ color: 'var(--accent-primary)' }}>AI</span>
          </span>
        </div>

        {/* Workspace nav */}
        <div className="px-2.5 pt-2">
          <SectionLabel>Workspace</SectionLabel>
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <NavLink key={item.href} item={item} active={active} />
            );
          })}
        </div>

        {/* Settings nav */}
        <div className="mt-6 px-2.5">
          <SectionLabel>Settings</SectionLabel>
          {SETTINGS_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <NavLink key={item.href} item={item} active={active} />
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Usage meter */}
        <div
          className="mx-3 mb-3 rounded-lg p-3"
          style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Usage
            </span>
            <span
              className="text-[10px] font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {plan}
            </span>
          </div>
          <div
            className="mb-1.5 h-1 overflow-hidden rounded-full"
            style={{ background: 'var(--bg-surface-3)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${usagePct}%`,
                background:
                  usagePct >= 90
                    ? 'var(--error)'
                    : usagePct >= 70
                      ? 'var(--warning)'
                      : 'var(--accent-primary)',
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span
              className="font-mono text-[11px]"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono, monospace)' }}
            >
              {minutesUsed}/{minutesLimit} min
            </span>
            {usagePct >= 80 && (
              <Link
                href="/settings/billing"
                className="text-[10px] font-semibold transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent-primary)' }}
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* User section */}
        <Link
          href="/settings"
          className="mx-2.5 mb-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors"
          style={{ ['--hover-bg' as string]: 'var(--bg-surface-2)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: 'var(--accent-primary)' }}
            >
              <span className="text-xs font-bold text-white">
                {(userName?.[0] || userEmail?.[0] || 'U').toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            {userName && (
              <div
                className="truncate text-[13px] font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {userName}
              </div>
            )}
            {userEmail && (
              <div
                className="truncate text-[11px]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {userEmail}
              </div>
            )}
          </div>
        </Link>
      </nav>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOP BAR */}
        <header
          className="flex h-14 shrink-0 items-center px-6 backdrop-blur-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div />
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={{ color: 'var(--text-tertiary)' }}
    >
      {children}
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
      )}
      style={{
        background: active ? 'var(--accent-subtle)' : undefined,
        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'var(--bg-surface-2)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <Icon
        size={18}
        strokeWidth={1.8}
        style={{ color: active ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}
      />
      {item.label}
    </Link>
  );
}
