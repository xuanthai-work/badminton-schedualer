"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CURRENT = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

export default function UpdatePrompt() {
  const { t } = useI18n();
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (CURRENT === "dev") return; // local dev: nothing to compare against
    let active = true;

    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (
          active &&
          data.version &&
          data.version !== "dev" &&
          data.version !== CURRENT
        ) {
          setStale(true);
        }
      } catch {
        /* offline or network error — ignore, try again later */
      }
    };

    void check();
    const id = window.setInterval(() => void check(), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!stale) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex w-[min(92%,28rem)] items-center justify-between gap-3 rounded-2xl border border-lime-500/30 bg-slate-900 px-4 py-3 shadow-2xl">
      <span className="text-sm text-slate-100">{t("update.available")}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-lime-500 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95"
      >
        <RefreshCw size={15} strokeWidth={2} />
        {t("update.action")}
      </button>
    </div>
  );
}
