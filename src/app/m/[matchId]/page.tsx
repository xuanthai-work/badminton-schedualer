"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  MapPin,
  QrCode,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";
import { bankByCode } from "@/lib/banks";
import MapsPreview from "@/components/MapsPreview";
import InitialAvatar from "@/components/InitialAvatar";
import PullToRefresh from "@/components/PullToRefresh";

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
  guests: PublicGuest[];
  expense: Expense | null;
  payee: Payee | null;
};

type Identity = { id: string; name: string; secret?: string };

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
  const { t, formatMatchHeading } = useI18n();

  const [data, setData] = useState<PublicData | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogStatus, setDialogStatus] = useState<"yes" | "no" | null | "rename">(
    null
  );
  const [nameInput, setNameInput] = useState("");
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [showListManual, setShowListManual] = useState(false);

  const load = useCallback(async () => {
    if (!matchId) return;
    const { data: result, error: rpcError } = await supabase.rpc(
      "get_public_match",
      { p_match_id: matchId }
    );
    if (rpcError) throw new Error(rpcError.message);
    if (!result) throw new Error(t("publicMatch.notFound"));
    const parsed = result as PublicData;
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
    triggerHaptic("light");
    setBusy(true);
    setError("");
    try {
      const { data: result, error: rpcError } = await supabase.rpc(
        "guest_rsvp",
        {
          p_match_id: matchId,
          p_guest_id: id,
          p_name: name,
          p_status: status,
          p_secret: identity?.secret ?? null,
        }
      );
      if (rpcError) {
        if (rpcError.message?.includes("match_full")) {
          throw new Error(t("publicMatch.matchFullError"));
        }
        if (rpcError.message?.includes("unauthorized_guest")) {
          throw new Error(t("publicMatch.errUnauthorizedGuest"));
        }
        throw new Error(rpcError.message);
      }
      // Persist the server-issued secret so later edits/payments are authorized.
      if (result && typeof result === "object" && "secret" in result) {
        const secret = (result as { secret?: string }).secret;
        if (secret) saveIdentity({ id, name, secret });
      }
      await load();
      triggerHaptic("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("publicMatch.errRsvp"));
      triggerHaptic("warning");
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

  const match = data?.match ?? null;
  const myGuest = identity
    ? data?.guests.find((g) => g.guestId === identity.id)
    : undefined;

  const yesGuests = data?.guests.filter((g) => g.status === "yes") ?? [];
  // Which player's VietQR to show on a closed match: an explicitly chosen one,
  // otherwise the identity remembered on this device.
  const activeGuest = selectedGuestId
    ? yesGuests.find((g) => g.guestId === selectedGuestId)
    : myGuest;

  const yesPeople = yesGuests.map((g) => ({
    key: g.guestId,
    name: g.name,
    avatarUrl: null,
  }));
  const isFull = yesPeople.length >= 20;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-10 pb-16 text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-80px] h-80 w-80 rounded-full bg-lime-500/10 blur-3xl"
      />

      <PullToRefresh onRefresh={load}>
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
                  {formatMatchHeading(match.date)}
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
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
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

            {match.status === "closed" ? (
              activeGuest &&
              activeGuest.status === "yes" &&
              !showListManual ? (
                <GuestPayment
                  amount={data.expense?.feePerPerson ?? 0}
                  payee={data.payee}
                  status={activeGuest.paymentStatus}
                  matchId={matchId}
                  guestId={activeGuest.guestId}
                  onBackToList={() => setShowListManual(true)}
                />
              ) : (
                <ClosedMatchGuestList
                  guests={yesGuests}
                  selectedId={activeGuest?.guestId ?? null}
                  onSelect={(guest) => {
                    setSelectedGuestId(guest.guestId);
                    saveIdentity({ id: guest.guestId, name: guest.name });
                    setShowListManual(false);
                  }}
                />
              )
            ) : (
              <section className="glass-panel rounded-2xl p-5">
                <h2 className="text-center text-lg font-semibold">
                  {t("publicMatch.rsvpQuestion")}
                </h2>
                {myGuest?.status === "yes" && identity ? (
                  <div className="mt-4 space-y-3">
                    <p className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-3 text-sm font-semibold text-emerald-300">
                      <CheckCircle2 size={18} strokeWidth={2} />
                      {t("publicMatch.registeredBadge")}
                    </p>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNameInput(identity.name);
                          setDialogStatus("rename");
                        }}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 active:scale-95"
                      >
                        {t("publicMatch.rename")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void submitRsvp(identity.id, identity.name, "no")
                        }
                        className="rounded-lg border border-rose-700/60 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:border-rose-500 active:scale-95 disabled:opacity-60"
                      >
                        {t("publicMatch.cancelRsvp")}
                      </button>
                    </div>
                  </div>
                ) : isFull ? (
                  <button
                    type="button"
                    disabled
                    className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 py-4 text-base font-semibold text-slate-400"
                  >
                    {t("publicMatch.matchFull")}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRsvp("yes")}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-500 py-4 text-base font-semibold text-slate-950 shadow-[0_0_30px_rgba(163,230,53,0.4)] transition hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 size={22} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={22} strokeWidth={2} />
                    )}
                    {t("publicMatch.join")}
                  </button>
                )}
              </section>
            )}

            {match.status === "open" && (
              <section>
                <PeopleList
                  title={t("publicMatch.joinList", { count: yesPeople.length })}
                  list={yesPeople}
                  tone="lime"
                  emptyLabel={t("publicMatch.nobody")}
                  selfId={identity?.id ?? null}
                />
              </section>
            )}
          </>
        ) : null}
        </div>
      </PullToRefresh>

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

function ClosedMatchGuestList({
  guests,
  selectedId,
  onSelect,
}: {
  guests: PublicGuest[];
  selectedId: string | null;
  onSelect: (guest: PublicGuest) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="glass-panel rounded-2xl p-5">
      <h2 className="text-base font-semibold text-slate-100">
        {t("publicMatch.closedListTitle")}
      </h2>
      <p className="mt-1 text-xs text-slate-400">
        {t("publicMatch.closedListSubtitle")}
      </p>
      {guests.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          {t("publicMatch.nobody")}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {guests.map((guest) => {
            const paid = guest.paymentStatus === "confirmed";
            return (
              <li
                key={guest.guestId}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/50 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <InitialAvatar name={guest.name} size={32} />
                  <span className="truncate text-sm text-slate-100">
                    {guest.name}
                  </span>
                  {guest.guestId === selectedId && (
                    <span className="rounded-full bg-lime-500/15 px-2 py-0.5 text-[10px] font-semibold text-lime-300">
                      {t("publicMatch.you")}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      paid
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {paid
                      ? t("publicMatch.confirmed")
                      : t("match.payUnpaid")}
                  </span>
                  {!paid && (
                    <button
                      type="button"
                      onClick={() => onSelect(guest)}
                      className="rounded-lg bg-lime-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95"
                    >
                      {t("publicMatch.imThisPlayer")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function GuestPayment({
  amount,
  payee,
  status,
  matchId,
  guestId,
  onBackToList,
}: {
  amount: number;
  payee: Payee | null;
  status: PaymentStatus;
  matchId: string | undefined;
  guestId: string;
  onBackToList?: () => void;
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
  // Standardized, regex-extractable transfer code: "BSCHEL <match> <guest>".
  // The webhook (/api/webhook/bank-payment) parses it to reconcile payments.
  const shortMatch = (matchId ?? "")
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();
  const shortGuest = (guestId ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase();
  const memo = `BSCHEL ${shortMatch} ${shortGuest}`;
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
                    className="h-auto w-auto"
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
        </>
      )}

      {onBackToList && (
        <button
          type="button"
          onClick={onBackToList}
          className="mt-4 w-full rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 active:scale-95"
        >
          {t("publicMatch.switchPlayer")}
        </button>
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

