import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  action?: ToastAction;
  durationMs: number;
}

interface ShowToastOptions {
  action?: ToastAction;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (message: string, options?: ShowToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, options?: ShowToastOptions) => {
    const id = crypto.randomUUID();
    const durationMs = options?.durationMs ?? DEFAULT_DURATION;
    const toast: Toast = { id, message, action: options?.action, durationMs };
    setToasts((prev) => [...prev, toast]);
    const timer = setTimeout(() => dismiss(id), durationMs);
    timers.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-slide-up flex items-center gap-3 rounded-md border border-neutral-200 bg-neutral-900 px-3.5 py-2.5 text-neutral-0 shadow-lg"
          >
            <span className="text-[12.5px]">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="rounded border border-neutral-700 px-2 py-0.5 text-[11px] font-medium text-neutral-0 transition-colors hover:bg-neutral-800"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
