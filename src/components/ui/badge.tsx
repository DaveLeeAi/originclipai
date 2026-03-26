// src/components/ui/badge.tsx
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'green' | 'amber' | 'red' | 'cyan' | 'muted';
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'border',
  accent: '',
  green: 'border',
  amber: 'border',
  red: '',
  cyan: 'border',
  muted: '',
};

const variantColors: Record<string, { bg: string; text: string; border?: string }> = {
  default: { bg: 'var(--bg-surface-2)', text: 'var(--text-secondary)', border: 'var(--border-default)' },
  accent: { bg: 'var(--accent-subtle)', text: 'var(--accent-primary)' },
  green: { bg: 'var(--success-subtle)', text: 'var(--success)', border: 'rgba(34,197,94,0.2)' },
  amber: { bg: 'var(--warning-subtle)', text: 'var(--warning)', border: 'rgba(245,158,11,0.2)' },
  red: { bg: 'var(--error-subtle)', text: 'var(--error)' },
  cyan: { bg: 'var(--info-subtle)', text: 'var(--info)', border: 'rgba(59,130,246,0.2)' },
  muted: { bg: 'var(--bg-surface-2)', text: 'var(--text-tertiary)' },
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const colors = variantColors[variant] ?? variantColors.default;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-semibold font-mono tracking-wide',
        variantStyles[variant],
        className,
      )}
      style={{
        background: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      {children}
    </span>
  );
}

// --- SCORE PILL ---

interface ScorePillProps {
  score: number;
}

export function ScorePill({ score }: ScorePillProps) {
  const variant = score >= 90 ? 'green' : score >= 80 ? 'amber' : 'muted';
  return <Badge variant={variant}>{score}</Badge>;
}

// --- STATUS DOT ---

interface StatusDotProps {
  status: 'approved' | 'review' | 'rejected' | 'draft' | 'queued' | 'posted' | 'failed' | 'posting' | 'scheduled';
  size?: 'sm' | 'md';
}

const statusColorMap: Record<string, string> = {
  approved: 'var(--success)',
  review: 'var(--warning)',
  rejected: 'var(--error)',
  draft: 'var(--text-tertiary)',
  queued: 'var(--pending)',
  posted: 'var(--success)',
  failed: 'var(--error)',
  posting: 'var(--info)',
  scheduled: 'var(--accent-primary)',
};

const pulsingStatuses = new Set(['queued', 'posting']);

export function StatusDot({ status, size = 'sm' }: StatusDotProps) {
  const sizeClass = size === 'sm' ? 'h-[7px] w-[7px]' : 'h-2.5 w-2.5';
  return (
    <span
      className={cn(
        'inline-block shrink-0 rounded-full',
        sizeClass,
        pulsingStatuses.has(status) && 'animate-pulse',
      )}
      style={{ background: statusColorMap[status] ?? 'var(--text-tertiary)' }}
    />
  );
}

// --- SPEAKER BADGE ---

interface SpeakerBadgeProps {
  speaker: string;
  role?: 'host' | 'guest' | 'co_host' | 'solo' | 'unknown';
}

export function SpeakerBadge({ speaker, role }: SpeakerBadgeProps) {
  const variant = role === 'guest' ? 'cyan' : 'accent';
  return <Badge variant={variant}>{speaker}</Badge>;
}

// --- PLATFORM ICON ---

interface PlatformIconProps {
  platform: string;
  size?: number;
  className?: string;
}

export function PlatformIcon({ platform, size = 16, className }: PlatformIconProps) {
  const iconClass = cn('inline-block', className);

  switch (platform.toLowerCase()) {
    case 'youtube':
      return (
        <svg className={iconClass} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z" />
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg className={iconClass} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12a4 4 0 104 4V4a5 5 0 005 5" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className={iconClass} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z" />
          <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
        </svg>
      );
    case 'x':
    case 'twitter':
      return (
        <svg className={iconClass} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
        </svg>
      );
    default:
      return <span className={iconClass}>?</span>;
  }
}
