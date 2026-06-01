'use client';

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  position?: 'bottom-right' | 'center';
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, position?: 'bottom-right' | 'center') => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info', position: 'bottom-right' | 'center' = 'center') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type, position }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* 右下角 Toast */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.filter((t) => t.position !== 'center').map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl
              border backdrop-blur-sm animate-fade-in min-w-[240px] max-w-[360px]
              ${t.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200' : ''}
              ${t.type === 'error' ? 'bg-red-950/90 border-red-500/30 text-red-200' : ''}
              ${t.type === 'info' ? 'bg-[var(--card-bg)]/90 border-[var(--gold)]/30 text-[var(--foreground)]' : ''}
            `}
          >
            {t.type === 'success' && <CheckCircle size={16} className="text-emerald-400 shrink-0" />}
            {t.type === 'error' && <XCircle size={16} className="text-red-400 shrink-0" />}
            {t.type === 'info' && <Info size={16} className="text-[var(--gold)] shrink-0" />}
            <span className="text-sm flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-current opacity-50 hover:opacity-100 shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {/* 居中 Toast */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        {toasts.filter((t) => t.position === 'center').map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl
              border backdrop-blur-md animate-fade-in min-w-[280px] max-w-[420px]
              ${t.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200' : ''}
              ${t.type === 'error' ? 'bg-red-950/90 border-red-500/30 text-red-200' : ''}
              ${t.type === 'info' ? 'bg-[var(--card-bg)]/95 border-[var(--gold)]/50 text-[var(--foreground)]' : ''}
            `}
          >
            {t.type === 'info' && <Info size={20} className="text-[var(--gold)] shrink-0" />}
            <span className="text-base font-medium flex-1 text-center">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
