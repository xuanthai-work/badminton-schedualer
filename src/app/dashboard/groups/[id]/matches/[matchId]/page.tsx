"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  MapPin,
  ReceiptText,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

type Rsvp = {
  userId: string;
  status: "yes" | "no";
  name: string;
};

type Match = {
  id: string;
  groupId: string;
  date: string;
  time: string;
  location: string;
  locationUrl: string | null;
  status: "open" | "closed";
};

type Expense = {
  courtFee: number;
  shuttleFee: number;
  waterFee: number;
  totalAmount: number;
  feePerPerson: number;
};

export default function MatchDetailPage() {
  const router = useRouter();
  const { t, formatVnd, formatDate } = useI18n();
  const params = useParams<{ id: string; matchId: string }>();
  const groupId = params?.id;
  const matchId = params?.matchId;

  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rsvpBusy, setRsvpBusy] = useState(false);

  const [courtFee, setCourtFee] = useState("");
  const [shuttleFee, setShuttleFee] = useState("");
  const [waterFee, setWaterFee] = useState("");
  const [settleBusy, setSettleBusy] = useState(false);
  const [settleMsg, setSettleMsg] = useState("");

  const load = useCallback(
    async (uid: string) => {
      if (!matchId || !groupId) return;
      setError("");

      const { data: matchRow, error: matchError } = await supabase
        .from("matches")
        .select("id, group_id, match_date, match_time, location, location_url, status")
        .eq("id", matchId)
        .maybeSingle();

      if (matchError) throw matchError;
      if (!matchRow) throw new Error(t("match.errNotFound"));
      if (matchRow.group_id !== groupId) {
        throw new Error(t("match.errWrongGroup"));
      }

      setMatch({
        id: matchRow.id,
        groupId: matchRow.group_id,
        date: matchRow.match_date,
        time: matchRow.match_time,
        location: matchRow.location,
        locationUrl: matchRow.location_url ?? null,
        status: matchRow.status === "closed" ? "closed" : "open",
      });

      const { data: membership, error: memberError } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", uid)
        .maybeSingle();
      if (memberError) throw memberError;
      setIsAdmin(membership?.role === "admin");

      const { data: rsvpRows, error: rsvpError } = await supabase
        .from("rsvps")
        .select("user_id, status, users ( name )")
        .eq("match_id", matchId);
      if (rsvpError) throw rsvpError;

      const mapped: Rsvp[] =
        rsvpRows?.map((row) => {
          const user = Array.isArray(row.users) ? row.users[0] : row.users;
          return {
            userId: row.user_id,
            status: row.status === "yes" ? "yes" : "no",
            name: user?.name ?? t("match.unknownUser"),
          };
        }) ?? [];
      setRsvps(mapped);

      const { data: expenseRow, error: expenseError } = await supabase
        .from("expenses")
        .select("court_fee, shuttle_fee, water_fee, total_amount, fee_per_person")
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
        setCourtFee(String(expenseRow.court_fee));
        setShuttleFee(String(expenseRow.shuttle_fee));
        setWaterFee(String(expenseRow.water_fee));
      } else {
        setExpense(null);
      }
    },
    [groupId, matchId, t]
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
        await load(data.session.user.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("match.errLoad"));
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, load, t]);

  const myRsvp = userId ? rsvps.find((r) => r.userId === userId) : undefined;
  const yesList = rsvps.filter((r) => r.status === "yes");
  const noList = rsvps.filter((r) => r.status === "no");

  const handleRsvp = async (status: "yes" | "no") => {
    if (!userId || !matchId || !match) return;
    if (match.status === "closed") return;

    setRsvpBusy(true);
    setError("");
    try {
      const { error: upsertError } = await supabase
        .from("rsvps")
        .upsert(
          { match_id: matchId, user_id: userId, status, responded_at: new Date().toISOString() },
          { onConflict: "match_id,user_id" }
        );
      if (upsertError) throw new Error(upsertError.message);
      await load(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.errRsvp"));
    } finally {
      setRsvpBusy(false);
    }
  };

  const handleSettle = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!matchId || !userId) return;

    setSettleBusy(true);
    setSettleMsg("");
    setError("");
    try {
      const court = Number(courtFee) || 0;
      const shuttle = Number(shuttleFee) || 0;
      const water = Number(waterFee) || 0;
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
      await load(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.errSettle"));
    } finally {
      setSettleBusy(false);
    }
  };

  const handleReopen = async () => {
    if (!matchId || !userId) return;
    if (!confirm(t("match.confirmReopen"))) return;
    setSettleBusy(true);
    try {
      const { error: updateError } = await supabase
        .from("matches")
        .update({ status: "open" })
        .eq("id", matchId);
      if (updateError) throw new Error(updateError.message);
      await load(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.errReopen"));
    } finally {
      setSettleBusy(false);
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
          <Link
            href={`/dashboard/groups/${groupId ?? ""}`}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-lime-400 transition hover:text-lime-300"
          >
            <ChevronLeft size={14} strokeWidth={2} />
            {t("match.backToGroup")}
          </Link>

          {match && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1">
                <h1 className="text-[28px] font-semibold leading-tight">
                  {t("match.title")}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                  <MapPin
                    size={16}
                    strokeWidth={1.75}
                    className="text-slate-400"
                  />
                  <span>{match.location}</span>
                  {match.locationUrl && (
                    <a
                      href={match.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-lime-500/30 bg-lime-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-lime-300 transition hover:bg-lime-500/20"
                    >
                      <ExternalLink size={12} strokeWidth={2} />
                      {t("match.openMaps")}
                    </a>
                  )}
                </div>
              </div>
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
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-500/10 text-lime-400">
                  <Calendar size={24} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                    {t("match.time")}
                  </p>
                  <p className="mt-0.5 text-lg font-semibold leading-tight">
                    {formatDate(match.date, {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}{" "}
                    · {match.time.slice(0, 5)}
                  </p>
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-2xl p-5">
              <h2 className="text-center text-lg font-semibold">
                {t("match.rsvpQuestion")}
              </h2>
              {match.status === "closed" ? (
                <p className="mt-3 text-center text-sm text-slate-400">
                  {t("match.closedNoRsvp")}
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <RsvpButton
                    label={t("match.join")}
                    icon={<CheckCircle2 size={28} strokeWidth={1.75} />}
                    active={myRsvp?.status === "yes"}
                    tone="lime"
                    disabled={rsvpBusy}
                    onClick={() => handleRsvp("yes")}
                  />
                  <RsvpButton
                    label={t("match.skip")}
                    icon={<XCircle size={28} strokeWidth={1.75} />}
                    active={myRsvp?.status === "no"}
                    tone="rose"
                    disabled={rsvpBusy}
                    onClick={() => handleRsvp("no")}
                  />
                </div>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <RsvpList
                title={t("match.joinList", { count: yesList.length })}
                list={yesList}
                tone="lime"
                emptyLabel={t("match.nobody")}
              />
              <RsvpList
                title={t("match.skipList", { count: noList.length })}
                list={noList}
                tone="rose"
                emptyLabel={t("match.nobody")}
              />
            </section>

            {expense && (
              <section className="glass-panel rounded-2xl p-5">
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
                  <dd className="text-right">{formatVnd(expense.shuttleFee)}</dd>
                  <dt>{t("match.waterFee")}</dt>
                  <dd className="text-right">{formatVnd(expense.waterFee)}</dd>
                  <dt className="mt-1 border-t border-white/10 pt-2 font-semibold text-slate-200">
                    {t("match.total")}
                  </dt>
                  <dd className="mt-1 border-t border-white/10 pt-2 text-right font-semibold text-slate-100">
                    {formatVnd(expense.totalAmount)}
                  </dd>
                </dl>
                <p className="mt-3 rounded-xl bg-lime-500/10 px-3 py-2 text-center text-sm font-medium text-lime-200">
                  {t("match.perPerson", {
                    amount: formatVnd(expense.feePerPerson),
                  })}
                </p>
              </section>
            )}

            {isAdmin && (
              <section className="glass-panel rounded-2xl border-lime-500/20 bg-lime-500/5 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                  {match.status === "closed" && (
                    <button
                      type="button"
                      onClick={handleReopen}
                      disabled={settleBusy}
                      className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-slate-500 disabled:opacity-60"
                    >
                      {t("match.reopen")}
                    </button>
                  )}
                </div>
                <form onSubmit={handleSettle} className="space-y-3">
                  <FeeInput
                    label={t("match.courtFeeLabel")}
                    value={courtFee}
                    onChange={setCourtFee}
                    placeholder="400.000"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FeeInput
                      label={t("match.shuttleFee")}
                      value={shuttleFee}
                      onChange={setShuttleFee}
                      placeholder="150.000"
                    />
                    <FeeInput
                      label={t("match.waterFee")}
                      value={waterFee}
                      onChange={setWaterFee}
                      placeholder="50.000"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    {t("match.splitNote", { count: yesList.length })}
                  </p>
                  {settleMsg && <p className="text-xs text-lime-300">{settleMsg}</p>}
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

function RsvpList({
  title,
  list,
  tone,
  emptyLabel,
}: {
  title: string;
  list: Rsvp[];
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
              key={r.userId}
              className="flex items-center gap-3 rounded-xl bg-slate-900/50 px-3 py-2"
            >
              <InitialAvatar name={r.name} size={32} />
              <span className="text-sm text-slate-100">{r.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InitialAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex items-center justify-center rounded-full border border-white/10 bg-slate-800/80 font-semibold text-lime-300"
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
  return (
    <div className="space-y-1 text-sm">
      <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </label>
      <input
        type="number"
        min={0}
        step="1000"
        className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "0"}
      />
    </div>
  );
}
