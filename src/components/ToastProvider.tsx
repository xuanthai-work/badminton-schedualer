"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

// App-wide transient feedback. useToast().show(message, type) drops a small
// bottom toast that auto-dismisses. For confident, non-loud copy — no
// exclamation marks. Use it for action results, not form-field validation
// (those stay inline next to the field).

type ToastType = "success" | "error" | "info";
type ToastItem = { id: number; message: string; type: ToastType };
type ShowFn = (message: string, type?: ToastType) => void;

const ToastContext = createContext<ShowFn | null>(null);

// Monotonic id source — only touched inside event handlers, never during
// render, so it can't desync server/client hydration.
let nextId = 0;

const ICON = {
  success: <CheckCircle2 size={16} strokeWidth={2} className="text-lime-400" />,
  error: <AlertCircle size={16} strokeWidth={2} className="text-rose-400" />,
  info: <Info size={16} strokeWidth={2} className="text-slate-300" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback<ShowFn>((message, type = "info") => {
    nextId += 1;
    const id = nextId;
    setToasts((list) => [...list, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="solid-panel pointer-events-auto flex max-w-[92vw] items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-slate-100 shadow-2xl"
          >
            <span className="shrink-0">{ICON[item.type]}</span>
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowFn {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
