"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

type Status = "checking" | "ready" | "invalid" | "done";

// Landing page for the Supabase password-recovery email link. The client is
// configured with detectSessionInUrl, so landing here with a valid link
// creates a session; we then let the user set a new password.
export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setStatus("ready");
    });

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      // An expired/used link comes back with #error=... instead of tokens.
      if (window.location.hash.includes("error=")) {
        setStatus("invalid");
        return;
      }
      if (data.session) {
        setStatus("ready");
        return;
      }
      // Give detectSessionInUrl a moment to process the recovery hash.
      window.setTimeout(() => {
        void (async () => {
          const { data: again } = await supabase.auth.getSession();
          if (!active) return;
          setStatus((prev) =>
            prev === "checking" ? (again.session ? "ready" : "invalid") : prev
          );
        })();
      }, 1500);
    };
    void init();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("auth.resetTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.resetMismatch"));
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setStatus("done");
      window.setTimeout(() => router.replace("/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errAuthFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-6 py-12 text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(163,230,53,0.18),_transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-120px] h-64 w-64 rounded-full bg-lime-500/20 blur-3xl"
      />

      <section className="glass-panel relative z-10 w-full max-w-[440px] rounded-2xl p-6 shadow-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-lime-400">
          {t("auth.brand")}
        </p>
        <h1 className="text-2xl font-semibold leading-tight">
          {t("auth.resetTitle")}
        </h1>

        {status === "checking" && (
          <p className="mt-4 text-sm text-slate-300">
            {t("auth.resetChecking")}
          </p>
        )}

        {status === "invalid" && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-rose-400">{t("auth.resetInvalid")}</p>
            <Link
              href="/"
              className="inline-block text-sm font-semibold text-lime-400 hover:text-lime-300"
            >
              {t("auth.backToLogin")}
            </Link>
          </div>
        )}

        {status === "done" && (
          <p className="mt-4 text-sm text-lime-300">
            {t("auth.resetSuccess")}
          </p>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-1 text-sm">
              <label className="ml-1 text-xs text-slate-400">
                {t("auth.resetNewPassword")}
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="ml-1 text-xs text-slate-400">
                {t("auth.resetConfirmPassword")}
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                placeholder="••••••••"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <button
              className="w-full rounded-xl bg-lime-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.4)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
              disabled={busy}
            >
              {busy ? t("auth.processing") : t("auth.resetSubmit")}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
