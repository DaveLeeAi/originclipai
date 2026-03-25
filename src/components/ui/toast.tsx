'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';

// ─── Types ──────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'undo';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  onUndo?: () => void;
}

interface ToastActions {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  undo: (message: string, onUndo: () => void) => void;
}

interface ToastContextValue {
  toast: ToastActions;
  /** @deprecated Use toast.success() / toast.error() instead */
  showToast: (message: string, type?: ToastType) => void;
}

// ─── Context ────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────

let nextId = 0;
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType, onUndo?: () => void) => {
    const id = nextId++;
    setToasts((prev) => {
      const next = [...prev, { id, message, type, onUndo }];
      // Keep only the most recent MAX_VISIBLE toasts
      return next.slice(-MAX_VISIBLE);
    });
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast: ToastActions = {
    success: useCallback((message: string) => addToast(message, 'success'), [addToast]),
    error: useCallback((message: string) => addToast(message, 'error'), [addToast]),
    warning: useCallback((message: string) => addToast(message, 'warning'), [addToast]),
    info: useCallback((message: string) => addToast(message, 'info'), [addToast]),
    undo: useCallback((message: string, onUndo: () => void) => addToast(message, 'undo', onUndo), [addToast]),
  };

  // Backward-compatible showToast
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    addToast(message, type);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}

      {/* Toast container — bottom center */}
      <div className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Toast Item ─────────────────────────────────────────────────────

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'border-l-emerald-500 border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-l-red-500 border-red-200 bg-red-50 text-red-800',
  warning: 'border-l-amber-500 border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-l-[#5046e5] border-[#e4e2dd] bg-white text-[#1a1a1a]',
  undo: 'border-l-amber-500 border-amber-200 bg-amber-50 text-amber-800',
};

const TYPE_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
  undo: '↩',
};

/** Auto-dismiss duration in ms. Errors are sticky (no auto-dismiss). */
function getDismissMs(type: ToastType): number | null {
  if (type === 'error') return null; // sticky
  if (type === 'undo') return 6000;
  return 4000;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in
    requestAnimationFrame(() => setVisible(true));

    const dismissMs = getDismissMs(toast.type);
    if (dismissMs === null) return; // sticky — no auto-dismiss

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 200);
    }, dismissMs);

    return () => clearTimeout(timer);
  }, [toast.id, toast.type, onDismiss]);

  const handleUndo = () => {
    toast.onUndo?.();
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-l-4 px-4 py-2.5 text-sm font-medium shadow-lg transition-all duration-200 max-w-sm ${
        TYPE_STYLES[toast.type]
      } ${visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <span className="text-xs">{TYPE_ICONS[toast.type]}</span>
      <span className="flex-1">{toast.message}</span>

      {/* Undo button */}
      {toast.type === 'undo' && toast.onUndo && (
        <button
          onClick={handleUndo}
          className="ml-1 rounded-md px-2 py-0.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
        >
          Undo
        </button>
      )}

      {/* Dismiss button for sticky errors */}
      {toast.type === 'error' && (
        <button
          onClick={handleDismiss}
          className="ml-1 rounded-md px-1.5 py-0.5 text-xs text-red-500 transition hover:bg-red-100"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
