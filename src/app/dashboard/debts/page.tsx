"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  ReceiptText,
  Share2,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";
import { useConfirm } from "@/components/ConfirmProvider";
import EmptyState from "@/components/EmptyState";
import BottomNav from "@/components/BottomNav";
import PullToRefresh from "@/components/PullToRefresh";
import InitialAvatar from "@/components/InitialAvatar";

type PayStatus = "unpaid" | "submitted" | "confirmed";

type Payer = {
  key: string;
  id: string;
  name: string;
  amount: number;
  status: PayStatus;
};

type LedgerMatch = {
  matchId: string;
  matchDate: string;
  matchTime: string;
  matchEndTime: string | null;
  location: string;
  courtFee: number;
  shuttleFee: number;
  totalAmount: number;
  feePerPerson: number;
  payers: Payer[];
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function LedgerPage() {
  return (
    <Suspense fallback={<LedgerFallback />}>
      <LedgerContent />
    </Suspense>
  );
}

function LedgerFallback() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 pb-28 text-slate-50">
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="glass-panel h-40 animate-pulse rounded-2xl" />
      </div>
    </main>
  );
}

function LedgerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, formatVnd, formatMatchHeading } = useI18n();
  const confirm = useConfirm();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<LedgerMatch[]>([]);
  // Deep link from the match page after settling: that match starts expanded.
  const [expanded, setExpanded] = useState<string | null>(
    () => searchParams?.get("matchId") ?? null
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payerToRemove, setPayerToRemove] = useState<
    { match: LedgerMatch; payer: Payer } | null
  >(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async (uid: string) => {
    const base = new Map<string, LedgerMatch>();

    // Matches I host that have been settled.
    const { data: matchRows, error: matchError } = await supabase
      .from("matches")
      .select(
        "id, match_date, match_time, match_end_time, location, expenses ( court_fee, shuttle_fee, total_amount, fee_per_person )"
      )
      .eq("created_by", uid)
      .eq("status", "closed");
    if (matchError) throw matchError;

    (matchRows ?? []).forEach((row) => {
      const expense = one(
        row.expenses as
          | {
              court_fee: number;
              shuttle_fee: number;
              total_amount: number;
              fee_per_person: number;
            }
          | {
              court_fee: number;
              shuttle_fee: number;
              total_amount: number;
              fee_per_person: number;
            }[]
          | null
      );
      if (!expense) return;
      base.set(row.id as string, {
        matchId: row.id as string,
        matchDate: row.match_date as string,
        matchTime: (row.match_time as string) ?? "",
        matchEndTime: (row.match_end_time as string | null) ?? null,
        location: (row.location as string) ?? "",
        courtFee: Number(expense.court_fee),
        shuttleFee: Number(expense.shuttle_fee),
        totalAmount: Number(expense.total_amount),
        feePerPerson: Number(expense.fee_per_person),
        payers: [],
      });
    });

    // Also include matches where I'm the payee.
    const { data: payeeRows } = await supabase
      .from("expenses")
      .select(
        "match_id, court_fee, shuttle_fee, total_amount, fee_per_person, matches ( id, match_date, match_time, match_end_time, location, status )"
      )
      .eq("payee_id", uid);

    (payeeRows ?? []).forEach((row) => {
      const match = one(
        row.matches as
          | {
              id: string;
              match_date: string;
              match_time: string | null;
              match_end_time: string | null;
              location: string | null;
              status: string;
            }
          | {
              id: string;
              match_date: string;
              match_time: string | null;
              match_end_time: string | null;
              location: string | null;
              status: string;
            }[]
          | null
      );
      if (!match || match.status !== "closed" || base.has(match.id)) return;
      base.set(match.id, {
        matchId: match.id,
        matchDate: match.match_date,
        matchTime: match.match_time ?? "",
        matchEndTime: match.match_end_time ?? null,
        location: match.location ?? "",
        courtFee: Number(row.court_fee),
        shuttleFee: Number(row.shuttle_fee),
        totalAmount: Number(row.total_amount),
        feePerPerson: Number(row.fee_per_person),
        payers: [],
      });
    });

    const matchIds = Array.from(base.keys());
    if (matchIds.length > 0) {
      const { data: guestRows } = await supabase
        .from("match_guests")
        .select("match_id, guest_id, name, status, payment_status")
        .in("match_id", matchIds);

      (guestRows ?? []).forEach((row) => {
        if (row.status !== "yes") return;
        const match = base.get(row.match_id as string);
        if (!match) return;
        // The host collects the money, so their own share is always paid.
        const isSelf = row.guest_id === uid;
        match.payers.push({
          key: `g:${row.guest_id}`,
          id: row.guest_id as string,
          name: (row.name as string) ?? "",
          amount: match.feePerPerson,
          status: isSelf ? "confirmed" : (row.payment_status as PayStatus),
        });
      });
    }

    setMatches(
      Array.from(base.values()).sort((a, b) =>
        `${b.matchDate}${b.matchTime}`.localeCompare(
          `${a.matchDate}${a.matchTime}`
        )
      )
    );
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          router.replace("/");
          return;
        }
        setUserId(data.session.user.id);
        await load(data.session.user.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("ledger.loadError"));
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, load, t]);

  // Live ledger: sync whenever any guest's payment status changes elsewhere.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`ledger-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_guests" },
        () => void load(userId)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  // Re-sync when the tab becomes visible again (mobile browsers sleep sockets).
  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void load(userId);
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [userId, load]);

  const confirmPayer = async (
    match: LedgerMatch,
    payer: Payer,
    targetConfirmed: boolean
  ) => {
    triggerHaptic("light");
    setBusy(payer.key);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("confirm_guest_payment", {
        p_match_id: match.matchId,
        p_guest_id: payer.id,
        p_confirmed: targetConfirmed,
      });
      if (rpcError) throw new Error(rpcError.message);
      if (userId) await load(userId);
      triggerHaptic("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ledger.actionError"));
      triggerHaptic("warning");
    } finally {
      setBusy(null);
    }
  };

  const handleCopyLink = async (matchId: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/m/${matchId}`
      );
      setCopiedId(matchId);
      window.setTimeout(
        () => setCopiedId((c) => (c === matchId ? null : c)),
        1600
      );
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const handleDelete = async (matchId: string) => {
    if (
      !(await confirm({
        message: t("matches.confirmDelete"),
        confirmLabel: t("matches.delete"),
        destructive: true,
      }))
    )
      return;
    setDeletingId(matchId);
    setError("");
    try {
      const { error: deleteError } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);
      if (deleteError) throw new Error(deleteError.message);
      setMatches((prev) => prev.filter((m) => m.matchId !== matchId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("matches.errDelete"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleRemoveGuest = async () => {
    if (!payerToRemove) return;
    const { match, payer } = payerToRemove;
    setRemoving(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("host_remove_guest", {
        p_match_id: match.matchId,
        p_guest_id: payer.id,
      });
      if (rpcError) throw new Error(rpcError.message);
      setPayerToRemove(null);
      if (userId) await load(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.errRemoveGuest"));
    } finally {
      setRemoving(false);
    }
  };

  const stats = (match: LedgerMatch) => {
    const total = match.payers.length;
    const paid = match.payers.filter((p) => p.status === "confirmed").length;
    const collected = match.payers
      .filter((p) => p.status === "confirmed")
      .reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, match.totalAmount - collected);
    return { total, paid, collected, remaining, completed: total > 0 && paid === total };
  };

  const visible = matches;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 pb-28 text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-120px] h-80 w-80 rounded-full bg-lime-500/[0.07] blur-3xl"
      />

      <PullToRefresh
        onRefresh={() => (userId ? load(userId) : Promise.resolve())}
      >
        <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[28px] font-semibold leading-tight">
              {t("ledger.title")}
            </h1>
            <p className="text-xs text-slate-400">{t("ledger.subtitle")}</p>
          </div>
        </header>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        {loading ? (
          <div className="glass-panel h-40 animate-pulse rounded-2xl" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            message={`${t("ledger.emptyTitle")} — ${t("ledger.emptyDesc")}`}
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((match) => {
              const s = stats(match);
              const open = expanded === match.matchId;
              return (
                <li
                  key={match.matchId}
                  className="glass-panel rounded-2xl p-4"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(open ? null : match.matchId)
                    }
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">
                        {formatMatchHeading(match.matchDate)}
                      </p>
                      {match.location && (
                        <p className="truncate text-xs text-slate-400">
                          {match.location}
                        </p>
                      )}
                      {match.matchTime && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                          <CalendarClock
                            size={12}
                            strokeWidth={1.75}
                            className="shrink-0 text-lime-400"
                          />
                          <span className="truncate">
                            {match.matchTime.slice(0, 5)}
                            {match.matchEndTime
                              ? ` - ${match.matchEndTime.slice(0, 5)}`
                              : ""}
                          </span>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                        <span>
                          {t("ledger.totalCost")}:{" "}
                          <span className="font-semibold text-slate-100">
                            {formatVnd(match.totalAmount)}
                          </span>
                        </span>
                        <span>
                          {t("ledger.collected")}:{" "}
                          <span className="font-semibold text-emerald-300">
                            {formatVnd(s.collected)}
                          </span>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {t("ledger.attendeeProgress", {
                          paid: s.paid,
                          total: s.total,
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {s.completed ? (
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                          {t("ledger.paidBadge")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
                          {t("ledger.remainingBadge", {
                            amount: formatVnd(s.remaining),
                          })}
                        </span>
                      )}
                      {open ? (
                        <ChevronUp size={16} strokeWidth={2} className="text-slate-500" />
                      ) : (
                        <ChevronDown size={16} strokeWidth={2} className="text-slate-500" />
                      )}
                    </div>
                  </button>

                  <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={() => void handleCopyLink(match.matchId)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-lime-500/50 hover:text-lime-300 active:scale-95"
                    >
                      {copiedId === match.matchId ? (
                        <Check size={12} strokeWidth={2.25} className="text-lime-400" />
                      ) : (
                        <Share2 size={12} strokeWidth={2} />
                      )}
                      {copiedId === match.matchId
                        ? t("match.linkCopied")
                        : t("match.shareLink")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(match.matchId)}
                      disabled={deletingId === match.matchId}
                      aria-label={t("matches.delete")}
                      className="ml-auto rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                    >
                      <Trash2 size={15} strokeWidth={2} />
                    </button>
                  </div>

                  {open && (
                    <div className="mt-3 space-y-4 border-t border-white/10 pt-3">
                      <section className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">
                          {t("match.joinList", { count: match.payers.length })}
                        </h3>
                        {match.payers.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          {t("ledger.emptyDesc")}
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {match.payers.map((payer) => {
                            const isSelf = payer.id === userId;
                            return (
                              <li
                                key={payer.key}
                                className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/50 px-3 py-2"
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <InitialAvatar name={payer.name} />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm text-slate-100">
                                      {payer.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {formatVnd(payer.amount)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  {isSelf ? (
                                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                                      {t("match.payConfirmed")}
                                    </span>
                                  ) : payer.status === "confirmed" ? (
                                    <button
                                      type="button"
                                      disabled={busy === payer.key}
                                      onClick={() =>
                                        void confirmPayer(match, payer, false)
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/30 active:scale-95 disabled:opacity-60"
                                    >
                                      <Check size={12} strokeWidth={2.25} />
                                      {t("match.payConfirmed")}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={busy === payer.key}
                                      onClick={() =>
                                        void confirmPayer(match, payer, true)
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                                    >
                                      {busy === payer.key ? (
                                        <Loader2
                                          size={12}
                                          className="animate-spin"
                                        />
                                      ) : (
                                        <Check size={12} strokeWidth={2.25} />
                                      )}
                                      {t("ledger.confirmPay")}
                                    </button>
                                  )}
                                  {payer.status !== "confirmed" && !isSelf && (
                                    <button
                                      type="button"
                                      aria-label={t("match.removeGuestTitle")}
                                      onClick={() =>
                                        setPayerToRemove({ match, payer })
                                      }
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:text-rose-400 active:scale-95"
                                    >
                                      <Trash2 size={15} strokeWidth={2} />
                                    </button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        )}
                      </section>

                      <FeeForm
                        match={match}
                        userId={userId}
                        onSaved={() => {
                          if (userId) void load(userId);
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </PullToRefresh>

      {payerToRemove && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-md sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-800/90 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">
              {t("match.removeGuestTitle")}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {payerToRemove.payer.id === userId
                ? t("match.removeSelfBody")
                : t("match.removeGuestBody", {
                    name: payerToRemove.payer.name,
                  })}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={removing}
                onClick={() => void handleRemoveGuest()}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 active:scale-95 disabled:opacity-60"
              >
                {t("match.removeGuestBtn")}
              </button>
              <button
                type="button"
                onClick={() => setPayerToRemove(null)}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 active:scale-95"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function toThousands(value: number): string {
  return value ? String(value / 1000) : "";
}

function FeeForm({
  match,
  userId,
  onSaved,
}: {
  match: LedgerMatch;
  userId: string | null;
  onSaved: () => void;
}) {
  const { t, formatVnd } = useI18n();
  const confirm = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [courtFee, setCourtFee] = useState(() => toThousands(match.courtFee));
  const [tubePrice, setTubePrice] = useState("");
  const [shuttleCount, setShuttleCount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  const tubePriceNum = Number(tubePrice) || 0;
  const shuttleCountNum = Number(shuttleCount) || 0;
  const shuttleFeeCalculated =
    tubePriceNum > 0 && shuttleCountNum > 0
      ? Math.round((tubePriceNum * 1000 / 12) * shuttleCountNum)
      : match.shuttleFee;
  const courtFeeTotal = (Number(courtFee) || 0) * 1000;
  const total = courtFeeTotal + shuttleFeeCalculated;
  const attendeeCount = match.payers.length;
  const perPerson = attendeeCount > 0 ? Math.round(total / attendeeCount) : 0;

  const handleToggleEdit = async () => {
    const paidCount = match.payers.filter(
      (p) => p.id !== userId && p.status === "confirmed"
    ).length;
    if (paidCount > 0) {
      const ok = await confirm({
        title: t("match.warnEditFeeTitle"),
        message: t("match.warnEditFeeMsg", { count: paidCount }),
        confirmLabel: t("common.continue"),
        cancelLabel: t("common.cancel"),
        destructive: true,
      });
      if (!ok) return;
    }
    setIsEditing(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setFormError("");
    try {
      if (courtFeeTotal < 0 || shuttleFeeCalculated < 0) {
        throw new Error(t("match.errNegativeFee"));
      }

      const { data, error: rpcError } = await supabase.rpc("settle_match", {
        target_match_id: match.matchId,
        court: courtFeeTotal,
        shuttle: shuttleFeeCalculated,
      });
      if (rpcError) throw new Error(rpcError.message);

      const result = data as {
        attendees?: number;
        fee_per_person?: number;
      } | null;
      if (result) {
        setMessage(
          t("match.settledMsg", {
            count: result.attendees ?? 0,
            amount: formatVnd(result.fee_per_person ?? 0),
          })
        );
      } else {
        setMessage(t("match.settledMsgSimple"));
      }
      setIsEditing(false);
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("match.errSettle"));
    } finally {
      setBusy(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-400">
          <ReceiptText size={14} className="shrink-0 text-lime-400" />
          <span className="truncate">
            {t("ledger.perPerson")}:{" "}
            <strong className="font-semibold text-lime-300">
              {formatVnd(match.feePerPerson)}
            </strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => void handleToggleEdit()}
          className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-lime-500/50 hover:text-lime-300 active:scale-95"
        >
          {t("match.editCosts")}
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-lime-500/20 bg-lime-500/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ReceiptText size={15} strokeWidth={1.75} className="text-lime-400" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">
            {t("match.expenses")}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-lime-500/50 hover:text-lime-300 active:scale-95"
        >
          {t("match.cancelEditCosts")}
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <FeeInput
          label={t("match.courtFeeLabel")}
          value={courtFee}
          onChange={setCourtFee}
          placeholder="400"
        />

        <div className="grid grid-cols-2 gap-3">
          <FeeInput
            label={t("ledger.tubePrice")}
            value={tubePrice}
            onChange={setTubePrice}
            placeholder="240"
          />
          <FeeInput
            label={t("ledger.shuttleCount")}
            value={shuttleCount}
            onChange={setShuttleCount}
            placeholder="6"
            suffix={t("ledger.shuttleUnit")}
            showPreview={false}
          />
        </div>
        <p className="ml-1 text-[11px] text-slate-400">
          = {t("match.shuttleFee")}: {formatVnd(shuttleFeeCalculated)}
        </p>

        <div className="space-y-2 rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{t("match.total")}</span>
            <span className="font-semibold text-slate-100">
              {formatVnd(total)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-2">
            <span className="text-xs font-medium uppercase tracking-wider text-lime-400">
              {t("ledger.perPerson")} (
              {t("ledger.peopleCount", { count: attendeeCount })})
            </span>
            <span className="text-xl font-bold text-lime-300">
              {formatVnd(perPerson)}
            </span>
          </div>
        </div>

        {formError && <p className="text-xs text-rose-400">{formError}</p>}
        {message && <p className="text-xs text-lime-300">{message}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-lime-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
        >
          {busy ? t("match.saving") : t("match.updateCosts")}
        </button>
      </form>
    </section>
  );
}

function FeeInput({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  showPreview = true,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  suffix?: string;
  showPreview?: boolean;
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
          className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2.5 pr-16 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder ?? "0"}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
          {suffix ?? t("match.feeThousands")}
        </span>
      </div>
      {showPreview && (
        <p className="ml-1 text-[11px] text-lime-300/80">
          {thousands > 0 ? `= ${formatVnd(thousands * 1000)}` : " "}
        </p>
      )}
    </div>
  );
}
