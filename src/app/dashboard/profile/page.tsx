"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  KeyRound,
  Landmark,
  LogOut,
  Save,
  UserCog,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";
import SelectField from "@/components/SelectField";
import ImageUpload from "@/components/ImageUpload";

const BANK_OPTIONS: { code: string; label: string }[] = [
  { code: "vcb", label: "Vietcombank" },
  { code: "tcb", label: "Techcombank" },
  { code: "mbbank", label: "MB Bank" },
  { code: "vpb", label: "VPBank" },
  { code: "bidv", label: "BIDV" },
  { code: "vietinbank", label: "VietinBank" },
  { code: "acb", label: "ACB" },
  { code: "sacombank", label: "Sacombank" },
  { code: "hdbank", label: "HDBank" },
  { code: "agribank", label: "Agribank" },
  { code: "tpbank", label: "TPBank" },
  { code: "vib", label: "VIB" },
  { code: "shb", label: "SHB" },
  { code: "ocb", label: "OCB" },
];

type ProfileRow = {
  name: string;
  username: string;
  email: string;
  bankId: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
  avatarUrl: string | null;
  bankQrUrl: string | null;
};

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,20}$/;

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState<string>("");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [providers, setProviders] = useState<string[]>([]);

  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [name, setName] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  const [bankId, setBankId] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankBusy, setBankBusy] = useState(false);
  const [bankMsg, setBankMsg] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          router.replace("/");
          return;
        }
        const u = data.session.user;
        setUserId(u.id);
        setAuthEmail(u.email ?? "");
        const list = (u.app_metadata?.providers as string[] | undefined) ?? [];
        setProviders(list);

        const { data: row, error: queryError } = await supabase
          .from("users")
          .select(
            "name, username, email, bank_id, bank_account, bank_account_name, avatar_url, bank_qr_url"
          )
          .eq("id", u.id)
          .maybeSingle();
        if (queryError) throw queryError;
        if (!row) throw new Error("Không tìm thấy hồ sơ.");

        const profileRow: ProfileRow = {
          name: row.name,
          username: row.username ?? "",
          email: row.email,
          bankId: row.bank_id ?? null,
          bankAccount: row.bank_account ?? null,
          bankAccountName: row.bank_account_name ?? null,
          avatarUrl: row.avatar_url ?? null,
          bankQrUrl: row.bank_qr_url ?? null,
        };
        setProfile(profileRow);
        setName(profileRow.username || profileRow.name);
        setBankId(profileRow.bankId ?? "");
        setBankAccount(profileRow.bankAccount ?? "");
        setBankAccountName(profileRow.bankAccountName ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải hồ sơ.");
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router]);

  const canChangePassword = providers.includes("email");

  const handleSaveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!USERNAME_REGEX.test(trimmed)) {
      setNameMsg("Tên đăng nhập 3-20 ký tự, chỉ chữ/số và . _ -");
      return;
    }
    setNameBusy(true);
    setNameMsg("");
    try {
      const current = profile?.username ?? "";
      if (trimmed.toLowerCase() !== current.toLowerCase()) {
        const { data: avail, error: availError } = await supabase.rpc(
          "is_username_available",
          { target_username: trimmed }
        );
        if (availError) throw new Error(availError.message);
        if (avail === false) {
          throw new Error("Tên đăng nhập này đã có người dùng.");
        }
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ name: trimmed, username: trimmed })
        .eq("id", userId);
      if (updateError) throw new Error(updateError.message);
      setProfile((p) =>
        p ? { ...p, name: trimmed, username: trimmed } : p
      );
      setNameMsg("Đã lưu tên đăng nhập.");
    } catch (err) {
      setNameMsg(err instanceof Error ? err.message : "Lỗi cập nhật tên.");
    } finally {
      setNameBusy(false);
    }
  };

  const handleSaveBank = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBankBusy(true);
    setBankMsg("");
    try {
      const payload = {
        bank_id: bankId || null,
        bank_account: bankAccount.trim() || null,
        bank_account_name: bankAccountName.trim() || null,
      };
      const { error: updateError } = await supabase
        .from("users")
        .update(payload)
        .eq("id", userId);
      if (updateError) throw new Error(updateError.message);
      setProfile((p) =>
        p
          ? {
              ...p,
              bankId: payload.bank_id,
              bankAccount: payload.bank_account,
              bankAccountName: payload.bank_account_name,
            }
          : p
      );
      setBankMsg("Đã lưu thông tin ngân hàng.");
    } catch (err) {
      setBankMsg(err instanceof Error ? err.message : "Lỗi cập nhật ngân hàng.");
    } finally {
      setBankBusy(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPwError("");
    setPwMsg("");
    if (newPassword.length < 8) {
      setPwError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setPwBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw new Error(updateError.message);
      setPwMsg("Đã đổi mật khẩu.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Lỗi đổi mật khẩu.");
    } finally {
      setPwBusy(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const persistImageUrl = async (
    column: "avatar_url" | "bank_qr_url",
    url: string | null
  ) => {
    const { error: updateError } = await supabase
      .from("users")
      .update({ [column]: url })
      .eq("id", userId);
    if (updateError) throw new Error(updateError.message);
    setProfile((p) => {
      if (!p) return p;
      if (column === "avatar_url") return { ...p, avatarUrl: url };
      return { ...p, bankQrUrl: url };
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 pb-28 text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-80px] h-80 w-80 rounded-full bg-lime-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-lime-400 transition hover:text-lime-300"
          >
            <ChevronLeft size={14} strokeWidth={2} />
            Dashboard
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-lime-400">
              Tài khoản
            </p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight">
              Hồ sơ & cài đặt
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="glass-panel h-40 animate-pulse rounded-2xl" />
        ) : error ? (
          <p className="text-sm text-rose-400">{error}</p>
        ) : profile ? (
          <>
            <section className="glass-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserCog
                  size={18}
                  strokeWidth={1.75}
                  className="text-lime-400"
                />
                <h2 className="text-base font-semibold">Thông tin cá nhân</h2>
              </div>

              <div className="mb-4 flex items-center gap-4">
                <ImageUpload
                  userId={userId}
                  bucket="avatars"
                  prefix="avatar"
                  currentUrl={profile.avatarUrl}
                  shape="circle"
                  size={80}
                  emptyLabel="Ảnh"
                  onUploaded={(url) => persistImageUrl("avatar_url", url)}
                  onRemoved={() => persistImageUrl("avatar_url", null)}
                />
                <p className="text-xs text-slate-400">
                  Ảnh đại diện hiển thị bên cạnh tên của bạn trong các nhóm. JPG/PNG, &lt;5MB.
                </p>
              </div>

              <form onSubmit={handleSaveName} className="space-y-4">
                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Tên đăng nhập
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="nguyenvana"
                    autoComplete="username"
                    required
                  />
                  <p className="ml-1 text-[11px] text-slate-500">
                    Dùng làm tên hiển thị và để đăng nhập. 3-20 ký tự, chỉ
                    chữ/số và . _ -
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Email
                  </label>
                  <input
                    className="w-full cursor-not-allowed rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-slate-400"
                    value={authEmail || profile.email}
                    readOnly
                  />
                  <p className="ml-1 text-[11px] text-slate-500">
                    Email gắn với tài khoản đăng nhập, không thể đổi tại đây.
                  </p>
                </div>
                {nameMsg && (
                  <p
                    className={`text-xs ${
                      nameMsg.startsWith("Đã")
                        ? "text-lime-300"
                        : "text-rose-400"
                    }`}
                  >
                    {nameMsg}
                  </p>
                )}
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.25)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
                  disabled={
                    nameBusy ||
                    name.trim() === (profile.username || profile.name)
                  }
                >
                  <Save size={14} strokeWidth={2} />
                  {nameBusy ? "Đang lưu..." : "Lưu tên"}
                </button>
              </form>
            </section>

            <section className="glass-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-2">
                <Landmark
                  size={18}
                  strokeWidth={1.75}
                  className="text-lime-400"
                />
                <h2 className="text-base font-semibold">Tài khoản ngân hàng</h2>
              </div>
              <p className="mb-4 text-xs text-slate-400">
                Dùng để sinh mã VietQR khi nhóm của bạn chốt chi phí. Thành viên
                trong nhóm sẽ thấy thông tin này.
              </p>
              <form onSubmit={handleSaveBank} className="space-y-4">
                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Ngân hàng
                  </label>
                  <SelectField
                    value={bankId}
                    onChange={setBankId}
                    placeholder="— Chọn ngân hàng —"
                    options={BANK_OPTIONS.map((bank) => ({
                      value: bank.code,
                      label: bank.label,
                    }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Số tài khoản
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                    value={bankAccount}
                    onChange={(event) => setBankAccount(event.target.value)}
                    placeholder="0123456789"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Tên chủ tài khoản
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                    value={bankAccountName}
                    onChange={(event) => setBankAccountName(event.target.value)}
                    placeholder="NGUYEN VAN A"
                  />
                </div>
                {bankMsg && (
                  <p
                    className={`text-xs ${
                      bankMsg.startsWith("Đã")
                        ? "text-lime-300"
                        : "text-rose-400"
                    }`}
                  >
                    {bankMsg}
                  </p>
                )}
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.25)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
                  disabled={bankBusy}
                >
                  <Save size={14} strokeWidth={2} />
                  {bankBusy ? "Đang lưu..." : "Lưu thông tin ngân hàng"}
                </button>
              </form>

              <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Mã QR thanh toán
                </p>
                <p className="text-xs text-slate-400">
                  Thay vì nhập số tài khoản, bạn có thể tải lên mã QR riêng để các thành viên quét và chuyển khoản trực tiếp.
                </p>
                <ImageUpload
                  userId={userId}
                  bucket="bank-qr"
                  prefix="qr"
                  currentUrl={profile.bankQrUrl}
                  shape="square"
                  size={192}
                  emptyLabel="Tải mã QR"
                  onUploaded={(url) => persistImageUrl("bank_qr_url", url)}
                  onRemoved={() => persistImageUrl("bank_qr_url", null)}
                />
              </div>
            </section>

            <section className="glass-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-2">
                <KeyRound
                  size={18}
                  strokeWidth={1.75}
                  className="text-lime-400"
                />
                <h2 className="text-base font-semibold">Đổi mật khẩu</h2>
              </div>

              {!canChangePassword ? (
                <p className="text-sm text-slate-400">
                  Tài khoản đăng nhập bằng{" "}
                  {providers[0] === "google" ? "Google" : "OAuth"}. Không thể đổi
                  mật khẩu tại đây.
                </p>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Tối thiểu 8 ký tự"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Xác nhận mật khẩu
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      autoComplete="new-password"
                    />
                  </div>
                  {pwError && <p className="text-xs text-rose-400">{pwError}</p>}
                  {pwMsg && <p className="text-xs text-lime-300">{pwMsg}</p>}
                  <button
                    className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.25)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
                    disabled={pwBusy || !newPassword || !confirmPassword}
                  >
                    <KeyRound size={14} strokeWidth={2} />
                    {pwBusy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                  </button>
                </form>
              )}
            </section>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-700/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15 active:scale-[0.99]"
            >
              <LogOut size={16} strokeWidth={1.75} />
              Đăng xuất
            </button>
          </>
        ) : null}
      </div>

      <BottomNav />
    </main>
  );
}
