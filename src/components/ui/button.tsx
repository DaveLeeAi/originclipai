// src/components/ui/button.tsx
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent-outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-gradient-to-r from-[#5046e5] to-[#7c3aed] text-white shadow-md shadow-indigo-500/25 hover:shadow-lg',
  secondary:
    'bg-white text-[#6b6960] border border-[#e4e2dd] shadow-sm hover:bg-[#f0efec]',
  danger:
    'bg-white text-[#dc2626] border border-[#e4e2dd] shadow-sm hover:bg-[#dc2626]/[0.04]',
  ghost:
    'bg-transparent text-[#6b6960] hover:bg-[#f0efec] hover:text-[#1a1a1a]',
  'accent-outline':
    'bg-[#5046e5]/[0.06] text-[#4338ca] border border-[#5046e5]/20 hover:bg-[#5046e5]/[0.1]',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-[10px]',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-bold transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
