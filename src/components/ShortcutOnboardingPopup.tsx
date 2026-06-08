"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// iOS-only nudge: offer a one-tap iCloud Shortcut to add the app to the Home
// Screen, sidestepping Safari's manual Share → "Add to Home Screen" flow.
// Shown once per device (dismissal persists), never inside the installed PWA.

// TODO: replace with the real iCloud Shortcut share link once published.
const SHORTCUT_URL = "https://www.icloud.com/shortcuts/81ca8cb09ddb4e32a725a912d247dc8a";

const DISMISS_KEY = "bs.prompt.shortcut";

const isIos = () => {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as desktop Safari, so also treat touch-capable "Mac".
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
};

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export default function ShortcutOnboardingPopup() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Guard everything behind window/navigator so SSR stays inert.
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (!isIos() || isStandalone()) return;

    const timer = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "dismissed");
    setOpen(false);
  };

  const install = () => {
    window.open(SHORTCUT_URL, "_blank", "noopener,noreferrer");
    localStorage.setItem(DISMISS_KEY, "done");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto w-[min(92%,28rem)]">
      <div className="solid-panel rounded-2xl p-4 shadow-2xl">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500/15 text-lime-300">
              <Sparkles size={18} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100">
                {t("onboard.shortcutTitle")}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                {t("onboard.shortcutBody")}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500 active:scale-95"
            >
              {t("onboard.shortcutSkip")}
            </button>
            <button
              type="button"
              onClick={install}
              className="rounded-xl bg-lime-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95"
            >
              {t("onboard.shortcutAction")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
