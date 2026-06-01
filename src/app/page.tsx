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
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-16 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(163,230,53,0.18),_transparent_45%)]" />
      <div className="absolute -top-24 right-[-120px] h-64 w-64 rounded-full bg-lime-500/20 blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-12 lg:flex-row lg:items-center lg:justify-between">
        <section className="max-w-xl space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-lime-400">
            Badminton Scheduler
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Chơi cầu lông không lo chia tiền.
          </h1>
          <p className="text-lg text-slate-300">
            Lên lịch, điểm danh realtime và chia chi phí cho cả nhóm trong vài phút.
          </p>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 text-sm text-slate-300">
            Đăng nhập bằng Google để sử dụng nhanh, hoặc dùng email/mật khẩu để đăng ký
            nội bộ.
          </div>
        </section>

        <section className="glass-panel w-full max-w-md rounded-3xl px-6 py-8 shadow-2xl">
          <div className="mb-6 flex rounded-full bg-slate-900/70 p-1 text-sm">
            <button
              type="button"
              className={`flex-1 rounded-full py-2 transition ${
                mode === "login"
                  ? "bg-lime-500 text-slate-950"
                  : "text-slate-300"
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
                  : "text-slate-300"
              }`}
              onClick={() => setMode("register")}
            >
              Đăng ký
            </button>
          </div>

          <button
            type="button"
            className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/70 py-3 text-sm font-medium text-slate-100 transition hover:shadow-[0_0_20px_rgba(163,230,53,0.4)]"
            onClick={handleOAuth}
            disabled={loading}
          >
            Đăng nhập với Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-slate-800" />
            hoặc
            <span className="h-px flex-1 bg-slate-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1 text-sm">
                <label className="text-slate-300">Tên hiển thị</label>
                <input
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-1 text-sm">
              <label className="text-slate-300">Email</label>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-300">Mật khẩu</label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {info && <p className="text-xs text-amber-300">{info}</p>}
            {error && <p className="text-xs text-rose-400">{error}</p>}

            <button
              className="w-full rounded-2xl bg-lime-500 py-3 text-sm font-semibold text-slate-950 transition hover:shadow-[0_0_20px_rgba(163,230,53,0.4)] disabled:opacity-60"
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
      </div>
    </main>
  );
}
