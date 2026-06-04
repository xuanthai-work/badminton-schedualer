"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  disablePush,
  enablePush,
  getPushSubscription,
  isPushSupported,
} from "@/lib/push";

export default function PushToggle() {
  const { t } = useI18n();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return; // unsupported: leave state at its defaults

    let active = true;
    (async () => {
      const sub = await getPushSubscription();
      if (!active) return;
      setSupported(true);
      setEnabled(Boolean(sub));
    })();
    return () => {
      active = false;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    setMsg(null);
    const result = await enablePush();
    if (result === "ok") {
      setEnabled(true);
      setMsg({ text: t("push.enabledMsg"), ok: true });
    } else if (result === "denied") {
      setMsg({ text: t("push.denied"), ok: false });
    } else {
      setMsg({ text: t("push.error"), ok: false });
    }
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    setMsg(null);
    const ok = await disablePush();
    if (ok) {
      setEnabled(false);
      setMsg({ text: t("push.disabledMsg"), ok: true });
    } else {
      setMsg({ text: t("push.error"), ok: false });
    }
    setBusy(false);
  };

  if (!supported) {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <BellOff size={18} strokeWidth={1.75} className="shrink-0" />
        <span>{t("push.unsupported")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500/10 text-lime-300">
            <Bell size={18} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100">
              {t("push.title")}
            </p>
            <p className="truncate text-xs text-slate-400">{t("push.body")}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={enabled ? disable : enable}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-60 ${
            enabled
              ? "border border-slate-700 text-slate-200 hover:border-slate-500"
              : "bg-lime-500 text-slate-950 hover:scale-[1.02]"
          }`}
        >
          {busy
            ? t("push.working")
            : enabled
              ? t("push.disable")
              : t("push.enable")}
        </button>
      </div>
      <p className="text-[11px] text-slate-500">{t("push.iosHint")}</p>
      {msg && (
        <p className={`text-xs ${msg.ok ? "text-lime-300" : "text-rose-400"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
