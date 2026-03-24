// src/components/review/use-review-shortcuts.ts
'use client';

import { useEffect, useCallback } from 'react';

interface UseReviewShortcutsParams {
  onApprove: () => void;
  onSkip: () => void;
  onNext: () => void;
  onPrevious: () => void;
  enabled?: boolean;
}

/**
 * Keyboard shortcuts for the review queue.
 * A = approve, S = skip, → = next, ← = previous
 *
 * Disabled when an input/textarea is focused (so editing text doesn't trigger shortcuts).
 */
export function useReviewShortcuts({
  onApprove,
  onSkip,
  onNext,
  onPrevious,
  enabled = true,
}: UseReviewShortcutsParams) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          onApprove();
          break;
        case 's':
          e.preventDefault();
          onSkip();
          break;
        case 'arrowright':
          e.preventDefault();
          onNext();
          break;
        case 'arrowleft':
          e.preventDefault();
          onPrevious();
          break;
      }
    },
    [onApprove, onSkip, onNext, onPrevious, enabled],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
