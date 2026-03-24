// src/components/ui/badge.tsx
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'green' | 'amber' | 'red' | 'cyan' | 'muted';
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: 'bg-[#f6f5f2] text-[#6b6960] border border-[#e4e2dd]',
  accent: 'bg-[#5046e5]/[0.06] text-[#4338ca]',
  green: 'bg-[#16a34a]/[0.08] text-[#16a34a] border border-[#16a34a]/20',
  amber: 'bg-[#d97706]/[0.08] text-[#d97706] border border-[#d97706]/20',
  red: 'bg-[#dc2626]/[0.06] text-[#dc2626]',
  cyan: 'bg-[#0891b2]/[0.07] text-[#0891b2] border border-[#0891b2]/20',
  muted: 'bg-[#a09e96]/[0.08] text-[#a09e96]',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold font-mono tracking-wide',
        variantStyles[variant],
        className,
      )}
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

const statusColors: Record<string, string> = {
  approved: 'bg-[#16a34a]',
  review: 'bg-[#d97706]',
  rejected: 'bg-[#dc2626]',
  draft: 'bg-[#a09e96]',
  queued: 'bg-[#5046e5]',
  posted: 'bg-[#16a34a]',
  failed: 'bg-[#dc2626]',
  posting: 'bg-[#5046e5] animate-pulse',
  scheduled: 'bg-[#5046e5]',
};

export function StatusDot({ status, size = 'sm' }: StatusDotProps) {
  const sizeClass = size === 'sm' ? 'h-[7px] w-[7px]' : 'h-2.5 w-2.5';
  return (
    <span className={cn('inline-block shrink-0 rounded-full', sizeClass, statusColors[status] ?? 'bg-[#a09e96]')} />
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
