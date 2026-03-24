// src/components/ui/card.tsx
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hoverable = false, selected = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border bg-white p-4 transition-all',
        selected
          ? 'border-[#5046e5]/30 bg-[#5046e5]/[0.03] shadow-sm'
          : 'border-[#e4e2dd] shadow-sm',
        hoverable && !selected && 'cursor-pointer hover:shadow-md hover:border-[#d4d2cc]',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center gap-2 mb-3', className)}>
      {children}
    </div>
  );
}
