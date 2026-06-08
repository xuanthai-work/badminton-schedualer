"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

// In-app replacement for the native window.confirm(): a styled dialog that
// matches the app's dark/lime theme. useConfirm() returns a promise so call
// sites stay almost identical — `if (!(await confirm({...}))) return;`.

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={(event) => {
            if (event.currentTarget === event.target) settle(false);
          }}
        >
          <div className="solid-panel w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            {options.title && (
              <h2 className="text-base font-semibold text-slate-100">
                {options.title}
              </h2>
            )}
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {options.message}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => settle(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 active:scale-95"
              >
                {options.cancelLabel ?? t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                className={
                  options.destructive
                    ? "rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 active:scale-95"
                    : "rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95"
                }
              >
                {options.confirmLabel ?? t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}
