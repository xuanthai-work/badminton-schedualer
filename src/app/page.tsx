"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ensureUserProfile } from "@/lib/userProfile";

type Mode = "login" | "register";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
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

  const handleOAuth = async () => {
    setError("");
    setInfo("");
    setLoading(true);

    const redirectTo = `${window.location.origin}/dashboard`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name.trim(),
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        if (!data.session) {
          setInfo("Vui lòng kiểm tra email để xác nhận tài khoản.");
          return;
        }

        if (data.user) {
          await ensureUserProfile(data.user);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
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
      setError(err instanceof Error ? err.message : "Xác thực thất bại.");
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
          Badminton Scheduler
        </p>
        <h1 className="text-[32px] font-semibold leading-tight text-slate-50">
          Chơi cầu lông không lo chia tiền.
        </h1>
        <p className="mt-3 text-base text-slate-300">
          Lên lịch, điểm danh realtime và chia chi phí cho cả nhóm trong vài phút.
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
            Đăng nhập
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
            Đăng ký
          </button>
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700/70 bg-slate-900/70 py-3 text-sm font-medium text-slate-100 transition hover:shadow-[0_0_20px_rgba(163,230,53,0.4)] disabled:opacity-60"
          onClick={handleOAuth}
          disabled={loading}
        >
          <GoogleMark />
          <span>Đăng nhập với Google</span>
        </button>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">
          <span className="h-px flex-1 bg-slate-800" />
          Hoặc dùng email
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1 text-sm">
              <label className="ml-1 text-xs text-slate-400">Tên hiển thị</label>
              <input
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-1 text-sm">
            <label className="ml-1 text-xs text-slate-400">Email</label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
              placeholder="email@vi-du.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="ml-1 text-xs text-slate-400">Mật khẩu</label>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
              ? "Đang xử lý..."
              : mode === "login"
                ? "Đăng nhập"
                : "Tạo tài khoản"}
          </button>
        </form>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
