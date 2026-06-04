"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Share, Smartphone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getPushSubscription, enablePush, isPushSupported } from "@/lib/push";

// First-visit prompts: install the PWA, then enable push. Each is asked once
// (dismissals persist in localStorage); both stay available on the profile /
// browser menu afterwards.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALL_KEY = "bs.prompt.install";
const PUSH_KEY = "bs.prompt.push";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Pure decision helper (no state): should the push prompt show?
async function decidePushStep(): Promise<"push" | null> {
  if (localStorage.getItem(PUSH_KEY)) return null;
  if (!isPushSupported()) return null;
  if (Notification.permission !== "default") return null;
  const sub = await getPushSubscription();
  if (sub) {
    localStorage.setItem(PUSH_KEY, "done");
    return null;
  }
  return "push";
}

export default function OnboardingPrompts() {
  const { t } = useI18n();
  const [step, setStep] = useState<"install" | "ios" | "push" | null>(null);
  const [busy, setBusy] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let active = true;
    const installAsked = Boolean(localStorage.getItem(INSTALL_KEY));
    const standalone = isStandalone();

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferred.current = event as BeforeInstallPromptEvent;
      if (!installAsked && !standalone && active) {
        setStep((s) => s ?? "install");
      }
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    (async () => {
      // Let the dashboard settle before nudging.
      await new Promise((r) => setTimeout(r, 1500));
      if (!active) return;

      if (standalone || installAsked) {
        // Already installed (or already asked) → consider the push prompt.
        const next = await decidePushStep();
        if (active) setStep((s) => s ?? next);
        return;
      }

      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIos) {
        // iOS has no programmatic install — show manual instructions.
        setStep((s) => s ?? "ios");
        return;
      }

      // Android/desktop: give beforeinstallprompt a moment to arrive; if it
      // never fires (unsupported / already installed) fall through to push.
      await new Promise((r) => setTimeout(r, 2500));
      if (!active || deferred.current) return;
      const next = await decidePushStep();
      if (active) setStep((s) => s ?? next);
    })();

    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const goToPushStep = async () => {
    setStep(await decidePushStep());
  };

  const handleInstall = async () => {
    const event = deferred.current;
    setBusy(true);
    try {
      if (event) {
        await event.prompt();
        await event.userChoice;
        deferred.current = null;
      }
    } catch {
      /* the native prompt can throw if re-used — ignore */
    }
    localStorage.setItem(INSTALL_KEY, "done");
    setBusy(false);
    await goToPushStep();
  };

  const dismissInstall = async () => {
    localStorage.setItem(INSTALL_KEY, "dismissed");
    await goToPushStep();
  };

  const handleEnablePush = async () => {
    setBusy(true);
    await enablePush();
    // Whatever the outcome, don't nag again — the profile toggle remains.
    localStorage.setItem(PUSH_KEY, "done");
    setBusy(false);
    setStep(null);
  };

  const dismissPush = () => {
    localStorage.setItem(PUSH_KEY, "dismissed");
    setStep(null);
  };

  if (!step) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto w-[min(92%,28rem)]">
      <div className="solid-panel rounded-2xl p-4 shadow-2xl">
        {step === "install" && (
          <PromptBody
            icon={<Smartphone size={18} strokeWidth={1.75} />}
            title={t("onboard.installTitle")}
            body={t("onboard.installBody")}
            secondary={{ label: t("onboard.later"), onClick: dismissInstall }}
            primary={{
              label: t("onboard.installAction"),
              onClick: handleInstall,
              busy,
            }}
          />
        )}
        {step === "ios" && (
          <PromptBody
            icon={<Share size={18} strokeWidth={1.75} />}
            title={t("onboard.installTitle")}
            body={t("onboard.iosBody")}
            primary={{
              label: t("onboard.iosOk"),
              onClick: dismissInstall,
              busy: false,
            }}
          />
        )}
        {step === "push" && (
          <PromptBody
            icon={<Bell size={18} strokeWidth={1.75} />}
            title={t("onboard.pushTitle")}
            body={t("onboard.pushBody")}
            secondary={{ label: t("onboard.later"), onClick: dismissPush }}
            primary={{
              label: t("onboard.pushAction"),
              onClick: handleEnablePush,
              busy,
            }}
          />
        )}
      </div>
    </div>
  );
}

function PromptBody({
  icon,
  title,
  body,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  primary: { label: string; onClick: () => void; busy: boolean };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500/15 text-lime-300">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
            {body}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {secondary && (
          <button
            type="button"
            onClick={secondary.onClick}
            className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500 active:scale-95"
          >
            {secondary.label}
          </button>
        )}
        <button
          type="button"
          disabled={primary.busy}
          onClick={primary.onClick}
          className="rounded-xl bg-lime-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
        >
          {primary.label}
        </button>
      </div>
    </div>
  );
}
