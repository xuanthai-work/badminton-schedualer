"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ensureUserProfile } from "@/lib/userProfile";
import { useI18n } from "@/lib/i18n";

type Mode = "login" | "register";

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,20}$/;

const isEmail = (value: string) => value.includes("@");

export default function HomePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        await ensureUserProfile(data.session.user);
        router.replace("/dashboard");
      }
    };

    void checkSession();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "register") {
        const trimmedUsername = username.trim();
        if (!USERNAME_REGEX.test(trimmedUsername)) {
          throw new Error(t("auth.errUsernameRule"));
        }

        const { data: availData, error: availError } = await supabase.rpc(
          "is_username_available",
          { target_username: trimmedUsername }
        );
        if (availError) throw new Error(availError.message);
        if (availData === false) {
          throw new Error(t("auth.errUsernameTaken"));
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              name: trimmedUsername,
              username: trimmedUsername,
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (!data.session) {
          setInfo(t("auth.checkEmail"));
          return;
        }

        if (data.user) {
          await ensureUserProfile(data.user);
        }
      } else {
        let signInEmail = identifier.trim();

        if (!isEmail(signInEmail)) {
          const { data: resolved, error: resolveError } = await supabase.rpc(
            "email_for_username",
            { target_username: signInEmail }
          );
          if (resolveError) throw new Error(resolveError.message);
          if (typeof resolved !== "string" || !resolved) {
            throw new Error(t("auth.errUsernameNotFound"));
          }
          signInEmail = resolved;
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: signInEmail,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        if (data.user) {
          await ensureUserProfile(data.user);
        }
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errAuthFailed"));
    } finally {
      setLoading(false);
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
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-lime-500/10 blur-3xl"
      />

      <section className="relative z-10 w-full max-w-[480px] text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-lime-400">
          {t("auth.brand")}
        </p>
        <h1 className="text-[32px] font-semibold leading-tight text-slate-50">
          {t("auth.heroTitle")}
        </h1>
        <p className="mt-3 text-base text-slate-300">
          {t("auth.heroSubtitle")}
        </p>
      </section>

      <section className="glass-panel relative z-10 mt-10 w-full max-w-[440px] rounded-2xl p-6 shadow-2xl">
        <div className="mb-6 flex rounded-full bg-slate-900/70 p-1 text-sm">
          <button
            type="button"
            className={`flex-1 rounded-full py-2 transition ${
              mode === "login"
                ? "bg-lime-500 text-slate-950"
                : "text-slate-300 hover:text-slate-100"
            }`}
            onClick={() => setMode("login")}
          >
            {t("auth.login")}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full py-2 transition ${
              mode === "register"
                ? "bg-lime-500 text-slate-950"
                : "text-slate-300 hover:text-slate-100"
            }`}
            onClick={() => setMode("register")}
          >
            {t("auth.register")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-1 text-sm">
                <label className="ml-1 text-xs text-slate-400">
                  {t("auth.username")}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                  placeholder={t("auth.usernamePlaceholder")}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                />
                <p className="ml-1 text-[11px] text-slate-500">
                  {t("auth.usernameHint")}
                </p>
              </div>
              <div className="space-y-1 text-sm">
                <label className="ml-1 text-xs text-slate-400">
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </>
          )}

          {mode === "login" && (
            <div className="space-y-1 text-sm">
              <label className="ml-1 text-xs text-slate-400">
                {t("auth.identifier")}
              </label>
              <input
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                placeholder={t("auth.identifierPlaceholder")}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                required
              />
            </div>
          )}

          <div className="space-y-1 text-sm">
            <label className="ml-1 text-xs text-slate-400">
              {t("auth.password")}
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
            />
          </div>

          {info && <p className="text-xs text-amber-300">{info}</p>}
          {error && <p className="text-xs text-rose-400">{error}</p>}

          <button
            className="w-full rounded-xl bg-lime-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.4)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
            disabled={loading}
          >
            {loading
              ? t("auth.processing")
              : mode === "login"
                ? t("auth.login")
                : t("auth.createAccount")}
          </button>
        </form>
      </section>
    </main>
  );
}
