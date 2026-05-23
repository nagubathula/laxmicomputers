'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
type Toast = { id: number; kind: ToastKind; text: string; duration: number };

type ToastContextValue = {
  toast: (text: string, opts?: { kind?: ToastKind; duration?: number }) => void;
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail-safe: return a noop toaster so components don't crash if rendered outside the provider.
    return {
      toast: (t) => console.log('[toast]', t),
      success: (t) => console.log('[toast.success]', t),
      error: (t) => console.warn('[toast.error]', t),
      info: (t) => console.log('[toast.info]', t),
    };
  }
  return ctx;
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue['toast']>((text, opts) => {
    const id = ++idRef.current;
    const t: Toast = { id, kind: opts?.kind ?? 'info', text, duration: opts?.duration ?? 3500 };
    setToasts((prev) => [...prev, t]);
    if (t.duration > 0) setTimeout(() => dismiss(id), t.duration);
  }, [dismiss]);

  const value: ToastContextValue = {
    toast,
    success: (text) => toast(text, { kind: 'success' }),
    error: (text) => toast(text, { kind: 'error' }),
    info: (text) => toast(text, { kind: 'info' }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [enter, setEnter] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setEnter(true)); }, []);

  const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertCircle : Info;
  const accent =
    toast.kind === 'success' ? 'text-emerald-600' :
    toast.kind === 'error' ? 'text-red-600' :
    'text-violet-600';

  return (
    <div
      className={`pointer-events-auto min-w-[260px] max-w-sm bg-white border border-stone-200 rounded-xl shadow-lg flex items-start gap-3 p-3 pr-2 transition-all duration-200 ${
        enter ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${accent}`} />
      <div className="flex-1 text-sm text-stone-900 pt-0.5">{toast.text}</div>
      <button
        onClick={onDismiss}
        className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
