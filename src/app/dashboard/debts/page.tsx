"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, ReceiptText } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import EmptyState from "@/components/EmptyState";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";

type PayStatus = "unpaid" | "submitted" | "confirmed";

type Payer = {
  key: string;
  kind: "member" | "guest";
  id: string;
  name: string;
  tag: string | null;
  avatarUrl: string | null;
  amount: number;
  status: PayStatus;
};

type LedgerMatch = {
  matchId: string;
  title: string;
  matchDate: string;
  location: string;
  totalAmount: number;
  feePerPerson: number;
  payers: Payer[];
};

type Filter = "all" | "pending" | "completed";

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default function LedgerPage() {
  const router = useRouter();
  const { t, formatVnd, formatDate } = useI18n();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<LedgerMatch[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (uid: string) => {
    const base = new Map<string, LedgerMatch>();

    // Matches I host that have been settled.
    const { data: matchRows, error: matchError } = await supabase
      .from("matches")
      .select(
        "id, title, match_date, location, expenses ( total_amount, fee_per_person )"
      )
      .eq("created_by", uid)
      .eq("status", "closed");
    if (matchError) throw matchError;

    (matchRows ?? []).forEach((row) => {
      const expense = one(
        row.expenses as
          | { total_amount: number; fee_per_person: number }
          | { total_amount: number; fee_per_person: number }[]
          | null
      );
      if (!expense) return;
      base.set(row.id as string, {
        matchId: row.id as string,
        title: (row.title as string | null) ?? "",
        matchDate: row.match_date as string,
        location: (row.location as string) ?? "",
        totalAmount: Number(expense.total_amount),
        feePerPerson: Number(expense.fee_per_person),
        payers: [],
      });
    });

    // Also include matches where I'm the payee.
    const { data: payeeRows } = await supabase
      .from("expenses")
      .select(
        "match_id, total_amount, fee_per_person, matches ( id, title, match_date, location, status )"
      )
      .eq("payee_id", uid);

    (payeeRows ?? []).forEach((row) => {
      const match = one(
        row.matches as
          | {
              id: string;
              title: string | null;
              match_date: string;
              location: string | null;
              status: string;
            }
          | {
              id: string;
              title: string | null;
              match_date: string;
              location: string | null;
              status: string;
            }[]
          | null
      );
      if (!match || match.status !== "closed" || base.has(match.id)) return;
      base.set(match.id, {
        matchId: match.id,
        title: match.title ?? "",
        matchDate: match.match_date,
        location: match.location ?? "",
        totalAmount: Number(row.total_amount),
        feePerPerson: Number(row.fee_per_person),
        payers: [],
      });
    });

    const matchIds = Array.from(base.keys());
    if (matchIds.length > 0) {
      const [{ data: paymentRows }, { data: guestRows }] = await Promise.all([
        supabase
          .from("payments")
          .select("match_id, user_id, amount, status, users ( name, tag, avatar_url )")
          .in("match_id", matchIds),
        supabase
          .from("match_guests")
          .select("match_id, guest_id, name, status, payment_status")
          .in("match_id", matchIds),
      ]);

      (paymentRows ?? []).forEach((row) => {
        const match = base.get(row.match_id as string);
        if (!match) return;
        const user = one(
          row.users as
            | { name: string; tag: string | null; avatar_url: string | null }
            | { name: string; tag: string | null; avatar_url: string | null }[]
            | null
        );
        match.payers.push({
          key: `m:${row.user_id}`,
          kind: "member",
          id: row.user_id as string,
          name: user?.name ?? "",
          tag: user?.tag ?? null,
          avatarUrl: user?.avatar_url ?? null,
          amount: Number(row.amount),
          status: row.status as PayStatus,
        });
      });

      (guestRows ?? []).forEach((row) => {
        if (row.status !== "yes") return;
        const match = base.get(row.match_id as string);
        if (!match) return;
        match.payers.push({
          key: `g:${row.guest_id}`,
          kind: "guest",
          id: row.guest_id as string,
          name: (row.name as string) ?? "",
          tag: null,
          avatarUrl: null,
          amount: match.feePerPerson,
          status: row.payment_status as PayStatus,
        });
      });
    }

    setMatches(
      Array.from(base.values()).sort((a, b) =>
        a.matchDate < b.matchDate ? 1 : a.matchDate > b.matchDate ? -1 : 0
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

  const confirmPayer = async (match: LedgerMatch, payer: Payer) => {
    setBusy(payer.key);
    setError("");
    try {
      const { error: rpcError } =
        payer.kind === "guest"
          ? await supabase.rpc("confirm_guest_payment", {
              p_match_id: match.matchId,
              p_guest_id: payer.id,
              p_confirmed: true,
            })
          : await supabase.rpc("confirm_payment", {
              target_match_id: match.matchId,
              target_user_id: payer.id,
              confirmed: true,
            });
      if (rpcError) throw new Error(rpcError.message);
      if (userId) await load(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ledger.actionError"));
    } finally {
      setBusy(null);
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

  const statusPill = (status: PayStatus) => {
    if (status === "confirmed")
      return {
        label: t("match.payConfirmed"),
        cls: "bg-emerald-500/20 text-emerald-300",
      };
    if (status === "submitted")
      return {
        label: t("match.paySubmitted"),
        cls: "bg-amber-500/20 text-amber-300",
      };
    return { label: t("match.payUnpaid"), cls: "bg-slate-800 text-slate-400" };
  };

  const visible = matches.filter((match) => {
    const s = stats(match);
    if (filter === "pending") return !s.completed;
    if (filter === "completed") return s.completed;
    return true;
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 pb-28 text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-80px] h-80 w-80 rounded-full bg-lime-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[28px] font-semibold leading-tight">
              {t("ledger.title")}
            </h1>
            <p className="text-xs text-slate-400">{t("ledger.subtitle")}</p>
          </div>
          <NotificationBell />
        </header>

        <nav className="flex gap-2 rounded-full bg-slate-900/70 p-1 text-sm">
          {(["all", "pending", "completed"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex-1 rounded-full py-2 transition ${
                filter === key
                  ? "bg-lime-500 text-slate-950"
                  : "text-slate-300 hover:text-slate-100"
              }`}
            >
              {t(`ledger.${key}`)}
            </button>
          ))}
        </nav>

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
                        {match.title || formatDate(match.matchDate)}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {formatDate(match.matchDate)}
                        {match.location ? ` · ${match.location}` : ""}
                      </p>
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

                  {open && (
                    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                      <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                        <span>
                          {t("ledger.perPerson")}: {formatVnd(match.feePerPerson)}
                        </span>
                        <Link
                          href={`/dashboard/matches/${match.matchId}`}
                          className="font-semibold text-lime-300 transition hover:text-lime-200"
                        >
                          {t("ledger.viewMatch")}
                        </Link>
                      </div>

                      {match.payers.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          {t("ledger.emptyDesc")}
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {match.payers.map((payer) => {
                            const pill = statusPill(payer.status);
                            return (
                              <li
                                key={payer.key}
                                className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/50 px-3 py-2"
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <InitialAvatar
                                    name={payer.name}
                                    url={payer.avatarUrl}
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm text-slate-100">
                                      {payer.name}
                                      {payer.tag && (
                                        <span className="text-lime-400">
                                          #{payer.tag}
                                        </span>
                                      )}
                                      {payer.kind === "guest" && (
                                        <span className="ml-1 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                                          {t("ledger.guestBadge")}
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {formatVnd(payer.amount)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill.cls}`}
                                  >
                                    {pill.label}
                                  </span>
                                  {payer.status === "submitted" && (
                                    <button
                                      type="button"
                                      disabled={busy === payer.key}
                                      onClick={() => void confirmPayer(match, payer)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                                    >
                                      <Check size={12} strokeWidth={2.25} />
                                      {t("ledger.confirmPay")}
                                    </button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <BottomNav />
    </main>
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
