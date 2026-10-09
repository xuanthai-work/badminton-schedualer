"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  Clock,
  Copy,
  MapPin,
  QrCode,
  ReceiptText,
  Share2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import { bankByCode } from "@/lib/banks";
import BottomNav from "@/components/BottomNav";
import MapsPreview from "@/components/MapsPreview";
import EditMatchPanel from "./EditMatchPanel";

type Guest = {
  guestId: string;
  name: string;
  status: "yes" | "no";
  paymentStatus: PaymentStatus;
};

type Person = {
  key: string;
  name: string;
  avatarUrl: string | null;
};

type Match = {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime: string | null;
  location: string;
  locationUrl: string | null;
  courtNo: number | null;
  rsvpLocked: boolean;
  status: "open" | "closed";
  createdBy: string | null;
};

type Expense = {
  courtFee: number;
  shuttleFee: number;
  waterFee: number;
  totalAmount: number;
  feePerPerson: number;
};

type Payee = {
  name: string;
  bankId: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
  bankQrUrl: string | null;
};

type PaymentStatus = "unpaid" | "submitted" | "confirmed";

export default function MatchDetailPage() {
  const router = useRouter();
  const { t, formatVnd, formatDate } = useI18n();
  const params = useParams<{ matchId: string }>();
  const matchId = params?.matchId;

  const [userId, setUserId] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [payee, setPayee] = useState<Payee | null>(null);
  const [payBusy, setPayBusy] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [courtFee, setCourtFee] = useState("");
  const [shuttleFee, setShuttleFee] = useState("");
  const [waterFee, setWaterFee] = useState("");
  const [settleBusy, setSettleBusy] = useState(false);
  const [settleMsg, setSettleMsg] = useState("");

  const load = useCallback(
    async () => {
      if (!matchId) return;
      setError("");

      const { data: matchRow, error: matchError } = await supabase
        .from("matches")
        .select(
          "id, title, match_date, match_time, match_end_time, location, location_url, court_no, status, created_by"
        )
        .eq("id", matchId)
        .maybeSingle();

      if (matchError) throw matchError;
      if (!matchRow) throw new Error(t("match.errNotFound"));

      setMatch({
        id: matchRow.id,
        title: matchRow.title ?? t("match.untitled"),
        date: matchRow.match_date,
        time: matchRow.match_time,
        endTime: matchRow.match_end_time ?? null,
        location: matchRow.location,
        locationUrl: matchRow.location_url ?? null,
        courtNo: matchRow.court_no ?? null,
        rsvpLocked:
          Date.now() >
          new Date(`${matchRow.match_date}T${matchRow.match_time}`).getTime() -
            30 * 60_000,
        status: matchRow.status === "closed" ? "closed" : "open",
        createdBy: matchRow.created_by ?? null,
      });

      const { data: guestRows, error: guestError } = await supabase
        .from("match_guests")
        .select("guest_id, name, status, payment_status")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });
      if (guestError) throw guestError;
      setGuests(
        (guestRows ?? []).map((row) => ({
          guestId: row.guest_id as string,
          name: row.name as string,
          status: row.status === "no" ? "no" : "yes",
          paymentStatus: row.payment_status as PaymentStatus,
        }))
      );

      const { data: expenseRow, error: expenseError } = await supabase
        .from("expenses")
        .select(
          "court_fee, shuttle_fee, water_fee, total_amount, fee_per_person, payee_id"
        )
        .eq("match_id", matchId)
        .maybeSingle();
      if (expenseError) throw expenseError;

      if (expenseRow) {
        setExpense({
          courtFee: Number(expenseRow.court_fee),
          shuttleFee: Number(expenseRow.shuttle_fee),
          waterFee: Number(expenseRow.water_fee),
          totalAmount: Number(expenseRow.total_amount),
          feePerPerson: Number(expenseRow.fee_per_person),
        });
        const toThousands = (n: unknown) => {
          const v = Number(n) || 0;
          return v ? String(v / 1000) : "";
        };
        setCourtFee(toThousands(expenseRow.court_fee));
        setShuttleFee(toThousands(expenseRow.shuttle_fee));
        setWaterFee(toThousands(expenseRow.water_fee));
      } else {
        setExpense(null);
      }

      // The payee is whoever settled (expenses.payee_id), falling back to the
      // match owner for legacy/unsettled rows.
      const resolvedPayee =
        (expenseRow?.payee_id as string | null) ??
        (matchRow.created_by as string | null) ??
        null;
      if (resolvedPayee) {
        const { data: payeeRow } = await supabase
          .from("users")
          .select("name, bank_id, bank_account, bank_account_name, bank_qr_url")
          .eq("id", resolvedPayee)
          .maybeSingle();
        setPayee(
          payeeRow
            ? {
                name: payeeRow.name,
                bankId: payeeRow.bank_id ?? null,
                bankAccount: payeeRow.bank_account ?? null,
                bankAccountName: payeeRow.bank_account_name ?? null,
                bankQrUrl: payeeRow.bank_qr_url ?? null,
              }
            : null
        );
      } else {
        setPayee(null);
      }
    },
    [matchId, t]
  );

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          router.replace("/");
          return;
        }
        setUserId(data.session.user.id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("match.errLoad"));
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, load, t]);

  // Live updates: refetch when this match's guests/status/expense change.
  useEffect(() => {
    if (!userId || !matchId) return;
    const channel = supabase
      .channel(`match-${matchId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_guests", filter: `match_id=eq.${matchId}` },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `match_id=eq.${matchId}` },
        () => void load()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, matchId, load]);

  const relativeDayLabel = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(target.getTime())) return "";

    const dayDiff = Math.round(
      (target.getTime() - today.getTime()) / 86_400_000
    );
    if (dayDiff === 0) return t("match.today");
    if (dayDiff === 1) return t("match.tomorrow");

    const monday = (d: Date) => {
      const x = new Date(d);
      x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
      return x;
    };
    const weekDiff = Math.round(
      (monday(target).getTime() - monday(today).getTime()) / (7 * 86_400_000)
    );
    const weekday = formatDate(dateStr, { weekday: "long" });
    if (weekDiff === 0) return t("match.thisWeek", { day: weekday });
    if (weekDiff === 1) return t("match.nextWeek", { day: weekday });
    return weekday;
  };

  const isHost = Boolean(match && userId && match.createdBy === userId);

  const guestYes = guests.filter((g) => g.status === "yes");
  const guestNo = guests.filter((g) => g.status === "no");
  const yesPeople: Person[] = guestYes.map((g) => ({
    key: g.guestId,
    name: g.name,
    avatarUrl: null,
  }));
  const noPeople: Person[] = guestNo.map((g) => ({
    key: g.guestId,
    name: g.name,
    avatarUrl: null,
  }));
  const attendeeCount = guestYes.length;

  const handleSettle = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!matchId || !userId) return;

    setSettleBusy(true);
    setSettleMsg("");
    setError("");
    try {
      const court = (Number(courtFee) || 0) * 1000;
      const shuttle = (Number(shuttleFee) || 0) * 1000;
      const water = (Number(waterFee) || 0) * 1000;
      if (court < 0 || shuttle < 0 || water < 0) {
        throw new Error(t("match.errNegativeFee"));
      }

      const { data, error: rpcError } = await supabase.rpc("settle_match", {
        target_match_id: matchId,
        court,
        shuttle,
        water,
      });
      if (rpcError) throw new Error(rpcError.message);

      const result = data as {
        attendees?: number;
        fee_per_person?: number;
      } | null;
      if (result) {
        setSettleMsg(
          t("match.settledMsg", {
            count: result.attendees ?? 0,
            amount: formatVnd(result.fee_per_person ?? 0),
          })
        );
      } else {
        setSettleMsg(t("match.settledMsgSimple"));
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.errSettle"));
    } finally {
      setSettleBusy(false);
    }
  };

  const handleConfirmGuest = async (guestId: string, confirmed: boolean) => {
    if (!matchId || !userId) return;
    setPayBusy(guestId);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("confirm_guest_payment", {
        p_match_id: matchId,
        p_guest_id: guestId,
        p_confirmed: confirmed,
      });
      if (rpcError) throw new Error(rpcError.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.errConfirmGuest"));
    } finally {
      setPayBusy(null);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/m/${matchId}`
      );
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1600);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 pb-28 text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-80px] h-80 w-80 rounded-full bg-lime-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="space-y-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-lime-400 transition hover:text-lime-300"
          >
            <ChevronLeft size={14} strokeWidth={2} />
            {t("dashboard.eyebrow")}
          </button>

          {match && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h1 className="text-[28px] font-semibold leading-tight">
                {match.title}
              </h1>
              <div className="flex items-center gap-2">
                {isHost && (
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-lime-500/50 hover:text-lime-300 active:scale-95"
                  >
                    {linkCopied ? (
                      <Check size={12} strokeWidth={2.25} className="text-lime-400" />
                    ) : (
                      <Share2 size={12} strokeWidth={2} />
                    )}
                    {linkCopied ? t("match.linkCopied") : t("match.shareLink")}
                  </button>
                )}
                {isHost && (
                  <EditMatchPanel
                    match={match}
                    onSaved={() => {
                      if (userId) void load();
                    }}
                  />
                )}
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    match.status === "open"
                      ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-slate-800 text-slate-400"
                  }`}
                >
                  {match.status === "open"
                    ? t("match.statusOpen")
                    : t("match.statusClosed")}
                </span>
              </div>
            </div>
          )}
        </header>

        {loading ? (
          <div className="glass-panel h-40 animate-pulse rounded-2xl" />
        ) : error && !match ? (
          <p className="text-sm text-rose-400">{error}</p>
        ) : match ? (
          <>
            {error && <p className="text-sm text-rose-400">{error}</p>}

            <section className="glass-panel rounded-2xl p-5">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-xl font-semibold leading-tight">
                  {relativeDayLabel(match.date)}
                </span>
                <span className="text-sm text-slate-400">
                  {formatDate(match.date, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </p>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <p className="inline-flex items-center gap-1.5 whitespace-nowrap text-xl font-semibold leading-tight text-lime-300">
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

            <section className="grid gap-4 sm:grid-cols-2">
              <RsvpList
                title={t("match.joinList", { count: yesPeople.length })}
                list={yesPeople}
                tone="lime"
                emptyLabel={t("match.nobody")}
              />
              <RsvpList
                title={t("match.skipList", { count: noPeople.length })}
                list={noPeople}
                tone="rose"
                emptyLabel={t("match.nobody")}
              />
            </section>

            {expense && (
              <section className="glass-panel space-y-4 rounded-2xl p-5">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <ReceiptText
                      size={18}
                      strokeWidth={1.75}
                      className="text-lime-400"
                    />
                    <h2 className="text-base font-semibold">
                      {t("match.expenses")}
                    </h2>
                  </div>
                  <dl className="grid grid-cols-2 gap-y-1 text-sm text-slate-300">
                    <dt>{t("match.courtFee")}</dt>
                    <dd className="text-right">{formatVnd(expense.courtFee)}</dd>
                    <dt>{t("match.shuttleFee")}</dt>
                    <dd className="text-right">
                      {formatVnd(expense.shuttleFee)}
                    </dd>
                    <dt>{t("match.waterFee")}</dt>
                    <dd className="text-right">{formatVnd(expense.waterFee)}</dd>
                    <dt className="mt-1 border-t border-white/10 pt-2 font-semibold text-slate-200">
                      {t("match.total")}
                    </dt>
                    <dd className="mt-1 border-t border-white/10 pt-2 text-right font-semibold text-slate-100">
                      {formatVnd(expense.totalAmount)}
                    </dd>
                  </dl>
                </div>

                <p className="rounded-xl bg-lime-500/10 px-3 py-2 text-center text-sm font-semibold text-lime-200">
                  {t("match.perPerson", {
                    amount: formatVnd(expense.feePerPerson),
                  })}
                </p>

                {match.status === "closed" && (
                  <div className="border-t border-white/10 pt-4">
                    <PaymentDetails
                      payee={payee}
                      memo={`Cau long ${match.date}`}
                    />
                  </div>
                )}
              </section>
            )}

            {match.status === "closed" && guests.length > 0 && (
              <GuestPaymentList
                guests={guests}
                feePerPerson={expense?.feePerPerson ?? 0}
                isHost={isHost}
                busyId={payBusy}
                onConfirm={handleConfirmGuest}
              />
            )}

            {isHost && (
              <section className="glass-panel rounded-2xl border-lime-500/20 bg-lime-500/5 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ReceiptText
                    size={18}
                    strokeWidth={1.75}
                    className="text-lime-400"
                  />
                  <h2 className="text-base font-semibold">
                    {match.status === "open"
                      ? t("match.settleTitle")
                      : t("match.updateTitle")}
                  </h2>
                </div>
                <form onSubmit={handleSettle} className="space-y-3">
                  <FeeInput
                    label={t("match.courtFeeLabel")}
                    value={courtFee}
                    onChange={setCourtFee}
                    placeholder="400"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FeeInput
                      label={t("match.shuttleFee")}
                      value={shuttleFee}
                      onChange={setShuttleFee}
                      placeholder="150"
                    />
                    <FeeInput
                      label={t("match.waterFee")}
                      value={waterFee}
                      onChange={setWaterFee}
                      placeholder="50"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    {t("match.splitNote", { count: attendeeCount })}
                  </p>
                  {settleMsg && (
                    <p className="text-xs text-lime-300">{settleMsg}</p>
                  )}
                  <button
                    className="w-full rounded-xl bg-lime-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.4)] transition hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                    disabled={settleBusy}
                  >
                    {settleBusy
                      ? t("match.saving")
                      : match.status === "open"
                        ? t("match.settleAndSplit")
                        : t("match.updateCosts")}
                  </button>
                </form>
              </section>
            )}
          </>
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}

function GuestPaymentList({
  guests,
  feePerPerson,
  isHost,
  busyId,
  onConfirm,
}: {
  guests: Guest[];
  feePerPerson: number;
  isHost: boolean;
  busyId: string | null;
  onConfirm: (guestId: string, confirmed: boolean) => void;
}) {
  const { t, formatVnd } = useI18n();

  const pill: Record<PaymentStatus, { label: string; cls: string }> = {
    unpaid: { label: t("match.payUnpaid"), cls: "bg-slate-800 text-slate-400" },
    submitted: {
      label: t("match.paySubmitted"),
      cls: "bg-amber-500/20 text-amber-300",
    },
    confirmed: {
      label: t("match.payConfirmed"),
      cls: "bg-emerald-500/20 text-emerald-300",
    },
  };

  return (
    <section className="glass-panel rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <ReceiptText size={18} strokeWidth={1.75} className="text-lime-400" />
        <h2 className="text-base font-semibold">
          {t("match.guestPaymentTitle")}
        </h2>
      </div>
      <ul className="space-y-2">
        {guests.map((g) => {
          const busy = busyId === g.guestId;
          return (
            <li
              key={g.guestId}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/50 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <InitialAvatar name={g.name} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-100">
                    {g.name}
                    <span className="ml-1 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                      {t("match.guestBadge")}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatVnd(feePerPerson)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {g.status === "no" ? (
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                    {t("match.skip")}
                  </span>
                ) : (
                  <>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill[g.paymentStatus].cls}`}
                    >
                      {pill[g.paymentStatus].label}
                    </span>
                    {isHost && g.paymentStatus === "submitted" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onConfirm(g.guestId, true)}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                      >
                        {t("match.payConfirm")}
                      </button>
                    )}
                    {isHost && g.paymentStatus === "confirmed" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onConfirm(g.guestId, false)}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 active:scale-95 disabled:opacity-60"
                      >
                        {t("match.payUnconfirm")}
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CopyButton({
  copied,
  onClick,
  label,
  copiedLabel,
}: {
  copied: boolean;
  onClick: () => void;
  label: string;
  copiedLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-slate-500 active:scale-95"
    >
      {copied ? (
        <Check size={12} strokeWidth={2.25} className="text-lime-400" />
      ) : (
        <Copy size={12} strokeWidth={1.75} />
      )}
      {copied ? copiedLabel : label}
    </button>
  );
}

function PaymentDetails({
  payee,
  memo,
}: {
  payee: Payee | null;
  memo: string;
}) {
  const { t } = useI18n();
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
  const qrSrc = payee?.bankQrUrl ?? null;
  const hasBank = Boolean(bank && payee?.bankAccount);

  const header = (
    <div className="mb-3 flex items-center gap-2">
      <QrCode size={18} strokeWidth={1.75} className="text-lime-400" />
      <h2 className="text-base font-semibold">{t("match.payTitle")}</h2>
    </div>
  );

  if (!payee || (!qrSrc && !hasBank)) {
    return (
      <div>
        {header}
        <p className="text-sm text-slate-400">{t("match.payNone")}</p>
      </div>
    );
  }

  return (
    <div>
      {header}

      {qrSrc && (
        <div className="flex flex-col items-center gap-2">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-2">
            <Image
              src={qrSrc}
              alt="Payment QR"
              width={220}
              height={220}
              unoptimized
            />
          </div>
          <p className="text-xs text-slate-400">{t("match.payScan")}</p>
        </div>
      )}

      <dl className="mt-4 space-y-2 text-sm">
        {bank && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-400">{t("match.payBank")}</dt>
            <dd className="text-slate-100">{bank.label}</dd>
          </div>
        )}
        {payee.bankAccount && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-400">{t("match.payAccount")}</dt>
            <dd className="flex items-center gap-2 text-slate-100">
              <span className="font-semibold tracking-wider">
                {payee.bankAccount}
              </span>
              <CopyButton
                copied={copied === "acc"}
                onClick={() => copy("acc", payee.bankAccount!)}
                label={t("match.payCopyAccount")}
                copiedLabel={t("match.payCopied")}
              />
            </dd>
          </div>
        )}
        {(payee.bankAccountName || payee.name) && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-400">{t("match.payHolder")}</dt>
            <dd className="text-slate-100">
              {payee.bankAccountName || payee.name}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2">
          <dt className="text-slate-400">{t("match.payMemoLabel")}</dt>
          <dd className="flex items-center gap-2 text-slate-100">
            <span className="truncate">{memo}</span>
            <CopyButton
              copied={copied === "memo"}
              onClick={() => copy("memo", memo)}
              label={t("match.payCopyMemo")}
              copiedLabel={t("match.payCopied")}
            />
          </dd>
        </div>
      </dl>
    </div>
  );
}

function RsvpList({
  title,
  list,
  tone,
  emptyLabel,
}: {
  title: string;
  list: Person[];
  tone: "lime" | "rose";
  emptyLabel: string;
}) {
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
          {list.map((r) => (
            <li
              key={r.key}
              className="flex items-center gap-3 rounded-xl bg-slate-900/50 px-3 py-2"
            >
              <InitialAvatar name={r.name} url={r.avatarUrl} size={32} />
              <span className="text-sm text-slate-100">{r.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
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

function FeeInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const { t, formatVnd } = useI18n();
  const thousands = Number(value) || 0;
  return (
    <div className="space-y-1 text-sm">
      <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          min={0}
          step="1"
          inputMode="numeric"
          className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 pr-16 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? "0"}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
          {t("match.feeThousands")}
        </span>
      </div>
      <p className="ml-1 text-[11px] text-lime-300/80">
        {thousands > 0 ? `= ${formatVnd(thousands * 1000)}` : " "}
      </p>
    </div>
  );
}
