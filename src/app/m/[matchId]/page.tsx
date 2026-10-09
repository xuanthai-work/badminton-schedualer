"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  MapPin,
  QrCode,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import { bankByCode } from "@/lib/banks";
import MapsPreview from "@/components/MapsPreview";

type RsvpStatus = "yes" | "no" | "pending";
type PaymentStatus = "unpaid" | "submitted" | "confirmed";

type PublicMatch = {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime: string | null;
  location: string;
  locationUrl: string | null;
  courtNo: number | null;
  status: "open" | "closed";
};

type PublicMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  status: RsvpStatus;
};

type PublicGuest = {
  guestId: string;
  name: string;
  status: "yes" | "no";
  paymentStatus: PaymentStatus;
};

type Payee = {
  name: string | null;
  bankId: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
};

type Expense = {
  courtFee: number;
  shuttleFee: number;
  waterFee: number;
  totalAmount: number;
  feePerPerson: number;
};

type PublicData = {
  match: PublicMatch;
  members: PublicMember[];
  guests: PublicGuest[];
  expense: Expense | null;
  payee: Payee | null;
};

type Identity = { id: string; name: string };

const IDENTITY_KEY = "badminton_guest_identity";

function newGuestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function PublicMatchPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params?.matchId;
  const { t, formatDate } = useI18n();

  const [data, setData] = useState<PublicData | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [rsvpLocked, setRsvpLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogStatus, setDialogStatus] = useState<"yes" | "no" | null | "rename">(
    null
  );
  const [nameInput, setNameInput] = useState("");

  const load = useCallback(async () => {
    if (!matchId) return;
    const { data: result, error: rpcError } = await supabase.rpc(
      "get_public_match",
      { p_match_id: matchId }
    );
    if (rpcError) throw new Error(rpcError.message);
    if (!result) throw new Error(t("publicMatch.notFound"));
    const parsed = result as PublicData;
    setRsvpLocked(
      Date.now() >
        new Date(`${parsed.match.date}T${parsed.match.time}`).getTime() -
          30 * 60_000
    );
    setData(parsed);
  }, [matchId, t]);

  useEffect(() => {
    const init = async () => {
      try {
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("publicMatch.errLoad"));
      } finally {
        setLoading(false);
      }
      try {
        const raw = window.localStorage.getItem(IDENTITY_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as Identity;
          if (stored?.id && stored?.name) setIdentity(stored);
        }
      } catch {
        /* ignore malformed identity */
      }
    };
    void init();
  }, [load, t]);

  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`public-match-${matchId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_guests",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          void load().catch(() => undefined);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId, load]);

  const saveIdentity = (next: Identity) => {
    setIdentity(next);
    try {
      window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — keep in-memory only */
    }
  };

  const submitRsvp = async (id: string, name: string, status: "yes" | "no") => {
    setBusy(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("guest_rsvp", {
        p_match_id: matchId,
        p_guest_id: id,
        p_name: name,
        p_status: status,
      });
      if (rpcError) throw new Error(rpcError.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("publicMatch.errRsvp"));
    } finally {
      setBusy(false);
    }
  };

  const handleRsvp = async (status: "yes" | "no") => {
    if (busy) return;
    if (identity) {
      await submitRsvp(identity.id, identity.name, status);
      return;
    }
    setNameInput("");
    setDialogStatus(status);
  };

  const handleDialogSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameInput.trim();
    if (!name) {
      setError(t("publicMatch.errName"));
      return;
    }
    const id = identity?.id ?? newGuestId();
    saveIdentity({ id, name });
    setDialogStatus(null);
    if (dialogStatus === "yes" || dialogStatus === "no") {
      await submitRsvp(id, name, dialogStatus);
    } else if (dialogStatus === "rename" && identity) {
      const current = data?.guests.find((g) => g.guestId === identity.id);
      if (current) {
        await submitRsvp(id, name, current.status);
      }
    }
  };

  const handleSubmitPayment = async () => {
    if (!identity || busy) return;
    setBusy(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("guest_submit_payment", {
        p_match_id: matchId,
        p_guest_id: identity.id,
      });
      if (rpcError) throw new Error(rpcError.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("publicMatch.errLoad"));
    } finally {
      setBusy(false);
    }
  };

  const match = data?.match ?? null;
  const myGuest = identity
    ? data?.guests.find((g) => g.guestId === identity.id)
    : undefined;

  const yesPeople = [
    ...(data?.members.filter((m) => m.status === "yes") ?? []).map((m) => ({
      key: m.userId,
      name: m.name,
      avatarUrl: m.avatarUrl,
    })),
    ...(data?.guests.filter((g) => g.status === "yes") ?? []).map((g) => ({
      key: g.guestId,
      name: g.name,
      avatarUrl: null,
    })),
  ];
  const noPeople = [
    ...(data?.members.filter((m) => m.status === "no") ?? []).map((m) => ({
      key: m.userId,
      name: m.name,
      avatarUrl: m.avatarUrl,
    })),
    ...(data?.guests.filter((g) => g.status === "no") ?? []).map((g) => ({
      key: g.guestId,
      name: g.name,
      avatarUrl: null,
    })),
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-10 pb-16 text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-80px] h-80 w-80 rounded-full bg-lime-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-xl flex-col gap-6">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-lime-400">
          BSche
        </p>

        {loading ? (
          <div className="glass-panel h-48 animate-pulse rounded-2xl" />
        ) : error && !match ? (
          <div className="glass-panel rounded-2xl p-6 text-center">
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        ) : data && match ? (
          <>
            <header className="space-y-1">
              <p className="text-sm text-slate-400">
                {t("publicMatch.inviteLine")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold leading-tight">
                  {data.match.title}
                </h1>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    match.status === "open"
                      ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-slate-800 text-slate-400"
                  }`}
                >
                  {match.status === "open"
                    ? t("publicMatch.statusOpen")
                    : t("publicMatch.statusClosed")}
                </span>
              </div>
            </header>

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <section className="glass-panel rounded-2xl p-5">
              <p className="text-lg font-semibold">
                {formatDate(match.date, { weekday: "long" })}
              </p>
              <p className="text-sm text-slate-400">
                {formatDate(match.date, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <p className="inline-flex items-center gap-1.5 whitespace-nowrap text-xl font-semibold text-lime-300">
                  <Clock size={18} strokeWidth={2} className="shrink-0" />
                  {match.time.slice(0, 5)}
                  {match.endTime ? ` – ${match.endTime.slice(0, 5)}` : ""}
                </p>
                <p className="flex min-w-0 items-center gap-1.5 text-base font-medium text-slate-100">
                  <MapPin
                    size={15}
                    strokeWidth={1.75}
                    className="shrink-0 text-lime-400"
                  />
                  <span className="min-w-0 truncate">{match.location}</span>
                  {match.courtNo != null && (
                    <span className="shrink-0 rounded-full bg-lime-500/15 px-2 py-0.5 text-xs font-semibold text-lime-300">
                      {t("matches.courtShort", { n: match.courtNo })}
                    </span>
                  )}
                </p>
              </div>

              {match.locationUrl && (
                <div className="mt-4">
                  <MapsPreview url={match.locationUrl} />
                </div>
              )}
            </section>

            <section className="glass-panel rounded-2xl p-5">
              <h2 className="text-center text-lg font-semibold">
                {t("publicMatch.rsvpQuestion")}
              </h2>
              {match.status === "closed" ? (
                <p className="mt-3 text-center text-sm text-slate-400">
                  {t("publicMatch.closedNoRsvp")}
                </p>
              ) : rsvpLocked ? (
                <p className="mt-3 text-center text-sm text-amber-300">
                  {t("publicMatch.rsvpLocked")}
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <RsvpButton
                    label={t("publicMatch.join")}
                    icon={<CheckCircle2 size={28} strokeWidth={1.75} />}
                    active={myGuest?.status === "yes"}
                    tone="lime"
                    disabled={busy}
                    onClick={() => void handleRsvp("yes")}
                  />
                  <RsvpButton
                    label={t("publicMatch.skip")}
                    icon={<XCircle size={28} strokeWidth={1.75} />}
                    active={myGuest?.status === "no"}
                    tone="rose"
                    disabled={busy}
                    onClick={() => void handleRsvp("no")}
                  />
                </div>
              )}
              {identity && match.status === "open" && !rsvpLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(identity.name);
                    setDialogStatus("rename");
                  }}
                  className="mx-auto mt-3 block text-xs font-semibold text-slate-400 underline-offset-4 transition hover:text-lime-300 hover:underline"
                >
                  {t("publicMatch.rename")}
                </button>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <PeopleList
                title={t("publicMatch.joinList", { count: yesPeople.length })}
                list={yesPeople}
                tone="lime"
                emptyLabel={t("publicMatch.nobody")}
                selfId={identity?.id ?? null}
              />
              <PeopleList
                title={t("publicMatch.skipList", { count: noPeople.length })}
                list={noPeople}
                tone="rose"
                emptyLabel={t("publicMatch.nobody")}
                selfId={identity?.id ?? null}
              />
            </section>

            {match.status === "closed" && myGuest?.status === "yes" && (
              <GuestPayment
                amount={data.expense?.feePerPerson ?? 0}
                payee={data.payee}
                status={myGuest.paymentStatus}
                guestName={identity?.name ?? myGuest.name}
                busy={busy}
                onSubmit={handleSubmitPayment}
              />
            )}
          </>
        ) : null}
      </div>

      {dialogStatus && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-md sm:items-center">
          <div className="bg-slate-900 border border-slate-800/90 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">{t("publicMatch.nameTitle")}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {t("publicMatch.nameHint")}
            </p>
            <form onSubmit={handleDialogSubmit} className="mt-4 space-y-4">
              <input
                autoFocus
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder={t("publicMatch.namePlaceholder")}
                maxLength={60}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDialogStatus(null)}
                  className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 active:scale-95"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-xl bg-lime-500 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                >
                  {t("publicMatch.nameSubmit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

type Person = { key: string; name: string; avatarUrl: string | null };

function PeopleList({
  title,
  list,
  tone,
  emptyLabel,
  selfId,
}: {
  title: string;
  list: Person[];
  tone: "lime" | "rose";
  emptyLabel: string;
  selfId: string | null;
}) {
  const { t } = useI18n();
  const toneClass = tone === "lime" ? "text-lime-300" : "text-rose-300";
  return (
    <div className="glass-panel rounded-2xl p-4">
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${toneClass}`}
      >
        {title}
      </p>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((p) => (
            <li
              key={p.key}
              className="flex items-center gap-3 rounded-xl bg-slate-900/50 px-3 py-2"
            >
              <InitialAvatar name={p.name} url={p.avatarUrl} size={32} />
              <span className="text-sm text-slate-100">{p.name}</span>
              {p.key === selfId && (
                <span className="ml-auto rounded-full bg-lime-500/15 px-2 py-0.5 text-[10px] font-semibold text-lime-300">
                  {t("publicMatch.you")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GuestPayment({
  amount,
  payee,
  status,
  guestName,
  busy,
  onSubmit,
}: {
  amount: number;
  payee: Payee | null;
  status: PaymentStatus;
  guestName: string;
  busy: boolean;
  onSubmit: () => void;
}) {
  const { t, formatVnd } = useI18n();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const bank = bankByCode(payee?.bankId);
  const bankAccount = payee?.bankAccount ?? null;
  const holder = payee?.bankAccountName || payee?.name || "";
  const memo = `${guestName} tien cau`;
  const hasBank = Boolean(bank && bankAccount);
  const qrSrc = hasBank
    ? `https://img.vietqr.io/image/${bank!.vietqr}-${bankAccount}-compact2.png?amount=${Math.round(
        amount
      )}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(holder)}`
    : null;

  return (
    <section className="glass-panel rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <QrCode size={18} strokeWidth={1.75} className="text-lime-400" />
        <h2 className="text-base font-semibold">
          {t("publicMatch.paymentTitle")}
        </h2>
      </div>

      <div className="rounded-xl bg-lime-500/10 px-3 py-3 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-lime-300">
          {t("publicMatch.amountDue")}
        </p>
        <p className="text-2xl font-semibold text-lime-200">
          {formatVnd(amount)}
        </p>
      </div>

      {status === "confirmed" ? (
        <p className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-3 text-sm font-semibold text-emerald-300">
          <CheckCircle2 size={18} strokeWidth={2} />
          {t("publicMatch.confirmed")}
        </p>
      ) : (
        <>
          {qrSrc && hasBank ? (
            <>
              <div className="mt-4 flex flex-col items-center gap-2">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-2">
                  <Image
                    src={qrSrc}
                    alt="VietQR"
                    width={220}
                    height={220}
                    unoptimized
                  />
                </div>
                <p className="text-xs text-slate-400">
                  {t("publicMatch.scanHint")}
                </p>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <CopyRow
                  label={t("publicMatch.bank")}
                  value={bank!.label}
                />
                <CopyRow
                  label={t("publicMatch.account")}
                  value={bankAccount!}
                  copied={copied === "acc"}
                  onCopy={() => void copy("acc", bankAccount!)}
                  copyLabel={t("publicMatch.copy")}
                  copiedLabel={t("publicMatch.copied")}
                />
                {holder && (
                  <CopyRow label={t("publicMatch.holder")} value={holder} />
                )}
                <CopyRow
                  label={t("publicMatch.memoLabel")}
                  value={memo}
                  copied={copied === "memo"}
                  onCopy={() => void copy("memo", memo)}
                  copyLabel={t("publicMatch.copy")}
                  copiedLabel={t("publicMatch.copied")}
                />
              </dl>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              {t("publicMatch.payNone")}
            </p>
          )}

          {status === "submitted" ? (
            <p className="mt-4 rounded-xl bg-amber-500/15 px-3 py-3 text-center text-sm font-semibold text-amber-300">
              {t("publicMatch.submitted")}
            </p>
          ) : (
            hasBank && (
              <button
                type="button"
                disabled={busy}
                onClick={onSubmit}
                className="mt-4 w-full rounded-xl bg-lime-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.35)] transition hover:scale-[1.01] active:scale-95 disabled:opacity-60"
              >
                {t("publicMatch.iPaid")}
              </button>
            )
          )}
        </>
      )}
    </section>
  );
}

function CopyRow({
  label,
  value,
  copied,
  onCopy,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copied?: boolean;
  onCopy?: () => void;
  copyLabel?: string;
  copiedLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-slate-100">
        <span className="truncate font-semibold tracking-wide">{value}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-slate-500 active:scale-95"
          >
            {copied ? (
              <Check size={12} strokeWidth={2.25} className="text-lime-400" />
            ) : (
              <Copy size={12} strokeWidth={1.75} />
            )}
            {copied ? copiedLabel : copyLabel}
          </button>
        )}
      </dd>
    </div>
  );
}

function RsvpButton({
  label,
  icon,
  active,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  tone: "lime" | "rose";
  disabled: boolean;
  onClick: () => void;
}) {
  const activeStyles =
    tone === "lime"
      ? "border-lime-500/50 bg-lime-500 text-slate-950 shadow-[0_0_30px_rgba(163,230,53,0.4)]"
      : "border-rose-500/50 bg-rose-500 text-slate-950 shadow-[0_0_30px_rgba(251,113,133,0.35)]";
  const inactiveHover =
    tone === "lime" ? "hover:border-lime-500/60" : "hover:border-rose-500/60";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border py-5 text-sm font-semibold transition active:scale-95 disabled:opacity-60 ${
        active
          ? activeStyles
          : `border-white/10 bg-slate-900/60 text-slate-200 ${inactiveHover}`
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function InitialAvatar({
  name,
  url = null,
  size = 32,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  if (url) {
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-full border border-white/10"
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt=""
          fill
          unoptimized
          sizes={`${size}px`}
          style={{ objectFit: "cover" }}
        />
      </div>
    );
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800/80 font-semibold text-lime-300"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {initial}
    </div>
  );
}
