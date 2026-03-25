'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from 'react';

// ─── Types ──────────────────────────────────────────────────────────

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'neutral';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

// ─── Context ────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within <ConfirmProvider>');
  }
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm: ConfirmFn = useCallback((options) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    dialog?.resolve(true);
    setDialog(null);
  }, [dialog]);

  const handleCancel = useCallback(() => {
    dialog?.resolve(false);
    setDialog(null);
  }, [dialog]);

  // Focus cancel button (safe option) on open
  useEffect(() => {
    if (dialog) {
      // Small delay to ensure button is rendered
      requestAnimationFrame(() => cancelRef.current?.focus());
    }
  }, [dialog]);

  // Close on Escape
  useEffect(() => {
    if (!dialog) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        dialog?.resolve(false);
        setDialog(null);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dialog]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {/* Dialog overlay */}
      {dialog && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-[#1a1a1a]">{dialog.title}</h2>
            <p className="mt-2 text-sm text-[#6b6960]">{dialog.description}</p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                ref={cancelRef}
                onClick={handleCancel}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[#6b6960] transition hover:bg-[#f6f5f2] hover:text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#5046e5]/30"
              >
                {dialog.cancelText ?? 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 ${
                  dialog.variant === 'destructive'
                    ? 'bg-[#dc2626] hover:bg-[#b91c1c] focus:ring-red-300'
                    : 'bg-[#5046e5] hover:bg-[#3f37c9] focus:ring-[#5046e5]/30'
                }`}
              >
                {dialog.confirmText ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
