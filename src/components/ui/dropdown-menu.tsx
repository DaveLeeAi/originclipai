// src/components/ui/dropdown-menu.tsx
'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';

// ─── Dropdown Menu ──────────────────────────────────────────────────

interface DropdownMenuProps {
  children: ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Render children, passing open/setOpen via context-free pattern */}
      {typeof children === 'function'
        ? (children as (props: { open: boolean; setOpen: (v: boolean) => void }) => ReactNode)({ open, setOpen })
        : renderChildren(children, open, setOpen)}
    </div>
  );
}

function renderChildren(
  children: ReactNode,
  open: boolean,
  setOpen: (v: boolean) => void,
): ReactNode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const childArray = Array.isArray(children) ? children : [children];
  return childArray.map((child, i) => {
    if (!child || typeof child !== 'object' || !('type' in child)) return child;
    // Inject open/setOpen into DropdownTrigger and DropdownContent
    if (child.type === DropdownTrigger || child.type === DropdownContent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = child.props as any;
      return { ...child, key: i, props: { ...props, _open: open, _setOpen: setOpen } };
    }
    return child;
  });
}

// ─── Trigger ────────────────────────────────────────────────────────

interface DropdownTriggerProps {
  children: ReactNode;
  /** @internal */ _open?: boolean;
  /** @internal */ _setOpen?: (v: boolean) => void;
}

export function DropdownTrigger({ children, _open, _setOpen }: DropdownTriggerProps) {
  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        _setOpen?.(!(_open ?? false));
      }}
    >
      {children}
    </div>
  );
}

// ─── Content ────────────────────────────────────────────────────────

interface DropdownContentProps {
  children: ReactNode;
  align?: 'start' | 'end';
  /** @internal */ _open?: boolean;
  /** @internal */ _setOpen?: (v: boolean) => void;
}

export function DropdownContent({ children, align = 'end', _open, _setOpen }: DropdownContentProps) {
  if (!_open) return null;

  return (
    <div
      className={`absolute top-full z-50 mt-1 min-w-[180px] rounded-lg py-1 animate-in fade-in zoom-in-95 duration-150 ${
        align === 'end' ? 'right-0' : 'left-0'
      }`}
      style={{
        background: 'var(--bg-base)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Inject _setOpen into DropdownItem children */}
      {Array.isArray(children)
        ? children.map((child, i) => injectSetOpen(child, _setOpen, i))
        : injectSetOpen(children, _setOpen, 0)}
    </div>
  );
}

function injectSetOpen(child: ReactNode, _setOpen: ((v: boolean) => void) | undefined, key: string | number): ReactNode {
  if (!child || typeof child !== 'object' || !('type' in child)) return child;
  if (child.type === DropdownItem) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = child.props as any;
    return { ...child, key: String(key), props: { ...props, _setOpen } };
  }
  return child;
}

// ─── Item ───────────────────────────────────────────────────────────

interface DropdownItemProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
  /** @internal */ _setOpen?: (v: boolean) => void;
}

export function DropdownItem({ children, onClick, disabled, variant = 'default', _setOpen }: DropdownItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    _setOpen?.(false);
    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded-md mx-1 px-3 py-2 text-xs font-medium transition-colors duration-150"
      style={{
        width: 'calc(100% - 8px)',
        color: disabled
          ? 'var(--text-tertiary)'
          : variant === 'destructive'
            ? 'var(--error)'
            : 'var(--text-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background =
            variant === 'destructive' ? 'var(--error-subtle)' : 'var(--bg-surface-1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

// ─── Separator ──────────────────────────────────────────────────────

export function DropdownSeparator() {
  return <div className="mx-2 my-1 h-px" style={{ background: 'var(--border-default)' }} />;
}
