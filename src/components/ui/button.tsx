// src/components/ui/button.tsx
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent-outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-[13px] rounded-md',
  md: 'px-4 py-2.5 text-[14px] rounded-md',
  lg: 'px-6 py-3 text-base rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, disabled, style, ...props }, ref) => {
    const variantStyle = getVariantStyle(variant);

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeStyles[size],
          className,
        )}
        disabled={disabled}
        style={{ ...variantStyle, ...style }}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

function getVariantStyle(variant: string): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--accent-primary)',
        color: '#FFFFFF',
        boxShadow: 'var(--shadow-sm)',
      };
    case 'secondary':
      return {
        background: 'var(--bg-base)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      };
    case 'danger':
      return {
        background: 'var(--bg-base)',
        color: 'var(--error)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--text-secondary)',
      };
    case 'accent-outline':
      return {
        background: 'var(--accent-subtle)',
        color: 'var(--accent-primary)',
        border: '1px solid rgba(99,102,241,0.2)',
      };
    default:
      return {};
  }
}
