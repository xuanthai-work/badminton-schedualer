"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushToggle() {
  const { t } = useI18n();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      Boolean(VAPID_PUBLIC);
    if (!ok) return; // unsupported: leave state at its defaults

    let active = true;
    (async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!active) return;
        setSupported(true);
        setEnabled(Boolean(sub));
      } catch {
        if (active) setSupported(true); // supported, but registration retryable
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMsg({ text: t("push.denied"), ok: false });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      const json = sub.toJSON();
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("no session");

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: uid,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
        { onConflict: "endpoint" }
      );
      if (error) throw new Error(error.message);
      setEnabled(true);
      setMsg({ text: t("push.enabledMsg"), ok: true });
    } catch {
      setMsg({ text: t("push.error"), ok: false });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
      setMsg({ text: t("push.disabledMsg"), ok: true });
    } catch {
      setMsg({ text: t("push.error"), ok: false });
    } finally {
      setBusy(false);
    }
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
