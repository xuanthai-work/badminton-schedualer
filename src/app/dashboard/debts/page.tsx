"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";

type PayStatus = "unpaid" | "submitted";

type MyDebt = {
  matchId: string;
  groupId: string;
  groupName: string;
  matchDate: string;
  location: string;
  amount: number;
  status: PayStatus;
};

type OwedRow = {
  matchId: string;
  groupName: string;
  matchDate: string;
  payerId: string;
  payerName: string;
  payerTag: string | null;
  amount: number;
  status: PayStatus;
};

type Tab = "owe" | "collect";

export default function DebtsPage() {
  const router = useRouter();
  const { t, formatVnd, formatDate } = useI18n();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mine, setMine] = useState<MyDebt[]>([]);
  const [owed, setOwed] = useState<OwedRow[]>([]);
  const [tab, setTab] = useState<Tab>("owe");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: mineData }, { data: owedData }] = await Promise.all([
      supabase.rpc("get_my_debts"),
      supabase.rpc("get_owed_to_me"),
    ]);
    setMine(
      ((mineData as Array<Record<string, unknown>> | null) ?? []).map((r) => ({
        matchId: r.match_id as string,
        groupId: r.group_id as string,
        groupName: (r.group_name as string) ?? "",
        matchDate: r.match_date as string,
        location: (r.location as string) ?? "",
        amount: Number(r.amount),
        status: r.status as PayStatus,
      }))
    );
    setOwed(
      ((owedData as Array<Record<string, unknown>> | null) ?? []).map((r) => ({
        matchId: r.match_id as string,
        groupName: (r.group_name as string) ?? "",
        matchDate: r.match_date as string,
        payerId: r.payer_id as string,
        payerName: (r.payer_name as string) ?? "",
        payerTag: (r.payer_tag as string | null) ?? null,
        amount: Number(r.amount),
        status: r.status as PayStatus,
      }))
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
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("debts.loadError"));
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, load, t]);

  const submit = async (matchId: string) => {
    setBusy(matchId);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("submit_payment", {
        target_match_id: matchId,
      });
      if (rpcError) throw new Error(rpcError.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("debts.actionError"));
    } finally {
      setBusy(null);
    }
  };

  const confirm = async (matchId: string, payerId: string) => {
    setBusy(`${matchId}:${payerId}`);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("confirm_payment", {
        target_match_id: matchId,
        target_user_id: payerId,
        confirmed: true,
      });
      if (rpcError) throw new Error(rpcError.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("debts.actionError"));
    } finally {
      setBusy(null);
    }
  };

  const oweTotal = mine.reduce((s, d) => s + d.amount, 0);
  const collectTotal = owed.reduce((s, d) => s + d.amount, 0);
  const showCollect = owed.length > 0;
  const activeTab: Tab = !showCollect ? "owe" : tab;

  const statusPill = (status: PayStatus) =>
    status === "submitted"
      ? { label: t("match.paySubmitted"), cls: "bg-amber-500/20 text-amber-300" }
      : { label: t("match.payUnpaid"), cls: "bg-slate-800 text-slate-400" };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 pb-28 text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-80px] h-80 w-80 rounded-full bg-lime-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-[28px] font-semibold leading-tight">
              {t("debts.title")}
            </h1>
            <NotificationBell />
          </div>
        </header>

        {showCollect && (
          <nav className="flex gap-2 rounded-full bg-slate-900/70 p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab("owe")}
              className={`flex-1 rounded-full py-2 transition ${
                activeTab === "owe"
                  ? "bg-lime-500 text-slate-950"
                  : "text-slate-300 hover:text-slate-100"
              }`}
            >
              {t("debts.tabIOwe")}
            </button>
            <button
              type="button"
              onClick={() => setTab("collect")}
              className={`flex-1 rounded-full py-2 transition ${
                activeTab === "collect"
                  ? "bg-lime-500 text-slate-950"
                  : "text-slate-300 hover:text-slate-100"
              }`}
            >
              {t("debts.tabCollect")}
            </button>
          </nav>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}

        {loading ? (
          <div className="glass-panel h-40 animate-pulse rounded-2xl" />
        ) : activeTab === "owe" ? (
          mine.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-sm text-slate-300">
              {t("debts.emptyOwe")}
            </div>
          ) : (
            <>
              <div className="glass-panel rounded-2xl p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {t("debts.oweTotal")}
                </p>
                <p className="mt-1 text-2xl font-bold text-rose-400">
                  {formatVnd(oweTotal)}
                </p>
              </div>
              <ul className="space-y-3">
                {mine.map((d) => {
                  const pill = statusPill(d.status);
                  return (
                    <li
                      key={d.matchId}
                      className="glass-panel flex items-center justify-between gap-3 rounded-2xl p-4"
                    >
                      <Link
                        href={`/dashboard/groups/${d.groupId}/matches/${d.matchId}`}
                        className="min-w-0 flex-1"
                      >
                        <p className="truncate text-sm font-medium text-slate-100">
                          {formatDate(d.matchDate)}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {d.groupName} · {d.location}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-200">
                          {formatVnd(d.amount)}
                        </p>
                      </Link>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill.cls}`}
                        >
                          {pill.label}
                        </span>
                        {d.status === "unpaid" && (
                          <button
                            type="button"
                            disabled={busy === d.matchId}
                            onClick={() => submit(d.matchId)}
                            className="rounded-lg bg-lime-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                          >
                            {t("match.payIPaid")}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )
        ) : owed.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 text-sm text-slate-300">
            {t("debts.emptyCollect")}
          </div>
        ) : (
          <>
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("debts.collectTotal")}
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                {formatVnd(collectTotal)}
              </p>
            </div>
            <ul className="space-y-3">
              {owed.map((d) => {
                const pill = statusPill(d.status);
                const key = `${d.matchId}:${d.payerId}`;
                return (
                  <li
                    key={key}
                    className="glass-panel flex items-center justify-between gap-3 rounded-2xl p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {d.payerName}
                        {d.payerTag && (
                          <span className="text-lime-400">#{d.payerTag}</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {d.groupName} · {formatDate(d.matchDate)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-200">
                        {formatVnd(d.amount)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill.cls}`}
                      >
                        {pill.label}
                      </span>
                      {d.status === "submitted" && (
                        <button
                          type="button"
                          disabled={busy === key}
                          onClick={() => confirm(d.matchId, d.payerId)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                        >
                          <Check size={12} strokeWidth={2.25} />
                          {t("match.payConfirm")}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
