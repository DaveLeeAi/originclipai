// src/components/shared/error-boundary.tsx
'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    // TODO: Send to Sentry
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[300px] items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#dc2626]/20 bg-[#dc2626]/[0.04]">
              <svg className="text-[#dc2626]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="mb-2 text-base font-bold">Something went wrong</h2>
            <p className="mb-5 text-sm text-[#6b6960]">
              {this.state.error?.message ?? 'An unexpected error occurred. Try refreshing the page.'}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Refresh page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- LOADING SKELETON ---

export function LoadingSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="mb-3 h-3 animate-pulse rounded bg-[#e4e2dd]"
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#e4e2dd] bg-white p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-[#e4e2dd]" />
        <div className="flex-1">
          <div className="mb-2 h-3 w-3/4 animate-pulse rounded bg-[#e4e2dd]" />
          <div className="h-2 w-1/2 animate-pulse rounded bg-[#e4e2dd]" />
        </div>
      </div>
      <LoadingSkeleton lines={2} />
    </div>
  );
}

// --- EMPTY STATE ---

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4 text-[#a09e96] opacity-40">{icon}</div>}
      <h3 className="mb-1 text-sm font-bold text-[#6b6960]">{title}</h3>
      {description && <p className="mb-5 max-w-xs text-xs text-[#a09e96]">{description}</p>}
      {action}
    </div>
  );
}
