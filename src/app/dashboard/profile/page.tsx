"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Dices,
  Globe,
  Hash,
  KeyRound,
  Landmark,
  Lock,
  LogOut,
  Save,
  UserCog,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import { LANGS } from "@/lib/i18n/translations";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import SelectField from "@/components/SelectField";
import ImageUpload from "@/components/ImageUpload";
import { BANKS } from "@/lib/banks";

type ProfileRow = {
  name: string;
  username: string;
  email: string;
  tag: string | null;
  bankId: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
  avatarUrl: string | null;
  bankQrUrl: string | null;
};

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,20}$/;
const TAG_REGEX = /^[0-9]{4}$/;
// Where users are told to write to change a locked tag.
const TAG_SUPPORT_EMAIL = "xuanthaibui204@gmail.com";

const randomTag = () =>
  String(Math.floor(Math.random() * 10000)).padStart(4, "0");

export default function ProfilePage() {
  const router = useRouter();
  const { t, lang, setLang } = useI18n();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState<string>("");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [providers, setProviders] = useState<string[]>([]);

  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [name, setName] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ text: string; ok: boolean } | null>(
    null
  );

  const [tagInput, setTagInput] = useState("");
  const [tagBusy, setTagBusy] = useState(false);
  const [tagMsg, setTagMsg] = useState<{ text: string; ok: boolean } | null>(
    null
  );

  const [bankId, setBankId] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankBusy, setBankBusy] = useState(false);
  const [bankMsg, setBankMsg] = useState<{ text: string; ok: boolean } | null>(
    null
  );

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
            "name, username, email, tag, bank_id, bank_account, bank_account_name, avatar_url, bank_qr_url"
          )
          .eq("id", u.id)
          .maybeSingle();
        if (queryError) throw queryError;
        if (!row) throw new Error(t("profile.errProfileNotFound"));

        const profileRow: ProfileRow = {
          name: row.name,
          username: row.username ?? "",
          email: row.email,
          tag: row.tag ?? null,
          bankId: row.bank_id ?? null,
          bankAccount: row.bank_account ?? null,
          bankAccountName: row.bank_account_name ?? null,
          avatarUrl: row.avatar_url ?? null,
          bankQrUrl: row.bank_qr_url ?? null,
        };
        setProfile(profileRow);
        setName(profileRow.username || profileRow.name);
        // Pre-fill the tag picker with a random suggestion when unset.
        setTagInput(profileRow.tag ?? randomTag());
        setBankId(profileRow.bankId ?? "");
        setBankAccount(profileRow.bankAccount ?? "");
        setBankAccountName(profileRow.bankAccountName ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : t("profile.errLoad"));
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, t]);

  const canChangePassword = providers.includes("email");

  const handleSaveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!USERNAME_REGEX.test(trimmed)) {
      setNameMsg({ text: t("profile.errUsernameRule"), ok: false });
      return;
    }
    setNameBusy(true);
    setNameMsg(null);
    try {
      const current = profile?.username ?? "";
      if (trimmed.toLowerCase() !== current.toLowerCase()) {
        const { data: avail, error: availError } = await supabase.rpc(
          "is_username_available",
          { target_username: trimmed }
        );
        if (availError) throw new Error(availError.message);
        if (avail === false) {
          throw new Error(t("profile.errUsernameTaken"));
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
      setNameMsg({ text: t("profile.nameSaved"), ok: true });
    } catch (err) {
      setNameMsg({
        text: err instanceof Error ? err.message : t("profile.errName"),
        ok: false,
      });
    } finally {
      setNameBusy(false);
    }
  };

  const handleSaveTag = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Tag is set once, then locked (changes go through the admin).
    if (profile?.tag) return;
    const value = tagInput.trim();
    if (!TAG_REGEX.test(value)) {
      setTagMsg({ text: t("profile.errTagFormat"), ok: false });
      return;
    }
    setTagBusy(true);
    setTagMsg(null);
    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({ tag: value })
        .eq("id", userId);
      if (updateError) throw new Error(updateError.message);
      setProfile((p) => (p ? { ...p, tag: value } : p));
      setTagMsg({ text: t("profile.tagSaved"), ok: true });
    } catch (err) {
      setTagMsg({
        text: err instanceof Error ? err.message : t("profile.errTag"),
        ok: false,
      });
    } finally {
      setTagBusy(false);
    }
  };

  const handleSaveBank = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBankBusy(true);
    setBankMsg(null);
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
      setBankMsg({ text: t("profile.bankSaved"), ok: true });
    } catch (err) {
      setBankMsg({
        text: err instanceof Error ? err.message : t("profile.errBank"),
        ok: false,
      });
    } finally {
      setBankBusy(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPwError("");
    setPwMsg("");
    if (newPassword.length < 8) {
      setPwError(t("profile.errPwShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(t("profile.errPwMismatch"));
      return;
    }
    setPwBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw new Error(updateError.message);
      setPwMsg(t("profile.pwChanged"));
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : t("profile.errPw"));
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
            {t("dashboard.eyebrow")}
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-lime-400">
                {t("profile.account")}
              </p>
              <h1 className="mt-1 text-[28px] font-semibold leading-tight">
                {t("profile.title")}
              </h1>
            </div>
            <NotificationBell />
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
                <h2 className="text-base font-semibold">
                  {t("profile.personalInfo")}
                </h2>
              </div>

              <div className="mb-4 flex items-center gap-4">
                <ImageUpload
                  userId={userId}
                  bucket="avatars"
                  prefix="avatar"
                  currentUrl={profile.avatarUrl}
                  shape="circle"
                  size={80}
                  emptyLabel={t("profile.avatarEmpty")}
                  onUploaded={(url) => persistImageUrl("avatar_url", url)}
                  onRemoved={() => persistImageUrl("avatar_url", null)}
                />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold leading-tight">
                    <span className="text-slate-100">
                      @{profile.username || profile.name}
                    </span>
                    <span className="text-lime-400">
                      #{profile.tag ?? "----"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {t("profile.avatarHint")}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveName} className="space-y-4">
                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {t("profile.username")}
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t("profile.usernamePlaceholder")}
                    autoComplete="username"
                    required
                  />
                  <p className="ml-1 text-[11px] text-slate-500">
                    {t("profile.usernameHint")}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {t("profile.email")}
                  </label>
                  <input
                    className="w-full cursor-not-allowed rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-slate-400"
                    value={authEmail || profile.email}
                    readOnly
                  />
                  <p className="ml-1 text-[11px] text-slate-500">
                    {t("profile.emailHint")}
                  </p>
                </div>
                {nameMsg && (
                  <p
                    className={`text-xs ${
                      nameMsg.ok ? "text-lime-300" : "text-rose-400"
                    }`}
                  >
                    {nameMsg.text}
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
                  {nameBusy ? t("profile.savingName") : t("profile.saveName")}
                </button>
              </form>

              <div className="mt-5 space-y-2 border-t border-white/10 pt-5">
                <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {t("profile.tag")}
                </label>
                {profile.tag ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-slate-100">
                        <Hash size={14} strokeWidth={2} className="text-lime-400" />
                        <span className="font-semibold tracking-wider">
                          {profile.tag}
                        </span>
                      </span>
                      <Lock size={14} strokeWidth={1.75} className="text-slate-500" />
                    </div>
                    <p className="ml-1 text-[11px] text-slate-500">
                      {t("profile.tagLockedHint", { email: TAG_SUPPORT_EMAIL })}
                    </p>
                  </>
                ) : (
                  <form onSubmit={handleSaveTag} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Hash
                          size={16}
                          strokeWidth={2}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lime-400"
                        />
                        <input
                          className="w-32 rounded-xl border border-slate-800 bg-slate-950/60 py-3 pl-9 pr-4 font-semibold tracking-wider text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                          value={tagInput}
                          onChange={(event) =>
                            setTagInput(
                              event.target.value.replace(/\D/g, "").slice(0, 4)
                            )
                          }
                          placeholder="0000"
                          inputMode="numeric"
                          maxLength={4}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setTagInput(randomTag())}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-3 text-xs text-slate-200 transition hover:border-slate-500 active:scale-95"
                      >
                        <Dices size={14} strokeWidth={1.75} />
                        {t("profile.randomize")}
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.25)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
                        disabled={tagBusy || !TAG_REGEX.test(tagInput)}
                      >
                        <Save size={14} strokeWidth={2} />
                        {tagBusy ? t("profile.savingTag") : t("profile.saveTag")}
                      </button>
                    </div>
                    <p className="ml-1 text-[11px] text-slate-500">
                      {t("profile.tagHint")}
                    </p>
                  </form>
                )}
                {tagMsg && (
                  <p
                    className={`ml-1 text-xs ${
                      tagMsg.ok ? "text-lime-300" : "text-rose-400"
                    }`}
                  >
                    {tagMsg.text}
                  </p>
                )}
              </div>
            </section>

            <section className="glass-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-2">
                <Landmark
                  size={18}
                  strokeWidth={1.75}
                  className="text-lime-400"
                />
                <h2 className="text-base font-semibold">
                  {t("profile.bankTitle")}
                </h2>
              </div>
              <p className="mb-4 text-xs text-slate-400">
                {t("profile.bankHint")}
              </p>
              <form onSubmit={handleSaveBank} className="space-y-4">
                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {t("profile.bank")}
                  </label>
                  <SelectField
                    value={bankId}
                    onChange={setBankId}
                    placeholder={t("profile.selectBank")}
                    options={BANKS.map((bank) => ({
                      value: bank.code,
                      label: bank.label,
                    }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {t("profile.accountNumber")}
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
                    {t("profile.accountName")}
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
                      bankMsg.ok ? "text-lime-300" : "text-rose-400"
                    }`}
                  >
                    {bankMsg.text}
                  </p>
                )}
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.25)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
                  disabled={bankBusy}
                >
                  <Save size={14} strokeWidth={2} />
                  {bankBusy ? t("profile.savingBank") : t("profile.saveBank")}
                </button>
              </form>

              <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {t("profile.qrTitle")}
                </p>
                <p className="text-xs text-slate-400">
                  {t("profile.qrHint")}
                </p>
                <ImageUpload
                  userId={userId}
                  bucket="bank-qr"
                  prefix="qr"
                  currentUrl={profile.bankQrUrl}
                  shape="square"
                  size={192}
                  emptyLabel={t("profile.qrEmpty")}
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
                <h2 className="text-base font-semibold">
                  {t("profile.passwordTitle")}
                </h2>
              </div>

              {!canChangePassword ? (
                <p className="text-sm text-slate-400">
                  {t("profile.oauthNoPasswordPrefix")}
                  {providers[0] === "google" ? "Google" : "OAuth"}
                  {t("profile.oauthNoPasswordSuffix")}
                </p>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {t("profile.newPassword")}
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder={t("profile.newPasswordPlaceholder")}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {t("profile.confirmPassword")}
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder={t("profile.confirmPasswordPlaceholder")}
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
                    {pwBusy
                      ? t("profile.updatingPassword")
                      : t("profile.updatePassword")}
                  </button>
                </form>
              )}
            </section>

            <section className="glass-panel rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-2">
                <Globe size={18} strokeWidth={1.75} className="text-lime-400" />
                <h2 className="text-base font-semibold">
                  {t("profile.languageTitle")}
                </h2>
              </div>
              <p className="mb-3 text-xs text-slate-400">
                {t("profile.languageHint")}
              </p>
              <SelectField
                value={lang}
                onChange={(next) => setLang(next as typeof lang)}
                options={LANGS.map((l) => ({ value: l.value, label: l.label }))}
              />
            </section>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-700/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15 active:scale-[0.99]"
            >
              <LogOut size={16} strokeWidth={1.75} />
              {t("profile.signOut")}
            </button>
          </>
        ) : null}
      </div>

      <BottomNav />
    </main>
  );
}
