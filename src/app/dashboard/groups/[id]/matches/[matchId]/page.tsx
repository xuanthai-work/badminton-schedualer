"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  Clock,
  CheckCircle2,
  ChevronLeft,
  Copy,
  MapPin,
  QrCode,
  ReceiptText,
  UserPlus,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import { bankByCode } from "@/lib/banks";
import BottomNav from "@/components/BottomNav";
import MapsPreview from "@/components/MapsPreview";
import SelectField from "@/components/SelectField";
import EditMatchPanel from "./EditMatchPanel";

type Rsvp = {
  userId: string;
  status: "yes" | "no" | "pending";
  name: string;
};

type Member = {
  userId: string;
  name: string;
};

type Match = {
  id: string;
  groupId: string;
  date: string;
  time: string;
  endTime: string | null;
  location: string;
  locationUrl: string | null;
  courtNo: number | null;
  status: "open" | "closed";
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

type Payment = {
  userId: string;
  name: string;
  tag: string | null;
  amount: number;
  status: PaymentStatus;
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
  const [members, setMembers] = useState<Member[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [attendBusy, setAttendBusy] = useState(false);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [payee, setPayee] = useState<Payee | null>(null);
  const [payeeId, setPayeeId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payBusy, setPayBusy] = useState<string | null>(null);
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
        .select(
          "id, group_id, match_date, match_time, match_end_time, location, location_url, court_no, status"
        )
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
        endTime: matchRow.match_end_time ?? null,
        location: matchRow.location,
        locationUrl: matchRow.location_url ?? null,
        courtNo: matchRow.court_no ?? null,
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
          const status: Rsvp["status"] =
            row.status === "yes"
              ? "yes"
              : row.status === "pending"
                ? "pending"
                : "no";
          return {
            userId: row.user_id,
            status,
            name: user?.name ?? t("match.unknownUser"),
          };
        }) ?? [];
      setRsvps(mapped);

      const { data: memberRows } = await supabase
        .from("group_members")
        .select("user_id, users ( name )")
        .eq("group_id", groupId);
      setMembers(
        (memberRows ?? []).map((row) => {
          const user = Array.isArray(row.users) ? row.users[0] : row.users;
          return {
            userId: row.user_id as string,
            name: user?.name ?? t("match.unknownUser"),
          };
        })
      );

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
        // Fee inputs are in thousands (type 300 → 300,000), so divide on load.
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

      // Payee for the closed-match payment card = the group's creator (the
      // main admin who collects). RLS lets group members read peers' rows.
      const { data: groupRow } = await supabase
        .from("groups")
        .select("created_by")
        .eq("id", groupId)
        .maybeSingle();
      setPayeeId(groupRow?.created_by ?? null);
      if (groupRow?.created_by) {
        const { data: payeeRow } = await supabase
          .from("users")
          .select("name, bank_id, bank_account, bank_account_name, bank_qr_url")
          .eq("id", groupRow.created_by)
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
      }

      const { data: paymentRows } = await supabase
        .from("payments")
        .select("user_id, amount, status, users ( name, tag )")
        .eq("match_id", matchId);
      setPayments(
        (paymentRows ?? []).map((row) => {
          const user = Array.isArray(row.users) ? row.users[0] : row.users;
          return {
            userId: row.user_id as string,
            name: user?.name ?? t("match.unknownUser"),
            tag: (user?.tag as string | null) ?? null,
            amount: Number(row.amount),
            status: row.status as PaymentStatus,
          };
        })
      );
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

  // Live updates: refetch when this match's rsvps/status/expense change.
  useEffect(() => {
    if (!userId || !matchId) return;
    const channel = supabase
      .channel(`match-${matchId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps", filter: `match_id=eq.${matchId}` },
        () => void load(userId)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        () => void load(userId)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `match_id=eq.${matchId}` },
        () => void load(userId)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments", filter: `match_id=eq.${matchId}` },
        () => void load(userId)
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, matchId, load]);

  // "Hôm nay" / "Ngày mai" / "Chủ Nhật tuần này" / "Thứ Bảy tuần sau" —
  // relative to today (Monday-based weeks); plain weekday otherwise.
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

  const myRsvp = userId ? rsvps.find((r) => r.userId === userId) : undefined;
  const yesList = rsvps.filter((r) => r.status === "yes");
  const noList = rsvps.filter((r) => r.status === "no");
  const pendingList = rsvps.filter((r) => r.status === "pending");
  const blockedIds = new Set(
    rsvps
      .filter((r) => r.status === "yes" || r.status === "pending")
      .map((r) => r.userId)
  );
  const addableMembers = members.filter((m) => !blockedIds.has(m.userId));

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
      // Inputs are in thousands (300 → 300,000).
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
      await load(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.errSettle"));
    } finally {
      setSettleBusy(false);
    }
  };

  const handleAddAttendee = async (targetUserId: string) => {
    if (!matchId || !userId || !targetUserId) return;
    setAddBusy(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("admin_add_attendee", {
        target_match_id: matchId,
        target_user_id: targetUserId,
      });
      if (rpcError) throw new Error(rpcError.message);
      await load(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.errAddAttendee"));
    } finally {
      setAddBusy(false);
    }
  };

  const handleConfirmAttendance = async (attended: boolean) => {
    if (!matchId || !userId) return;
    setAttendBusy(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("confirm_attendance", {
        target_match_id: matchId,
        attended,
      });
      if (rpcError) throw new Error(rpcError.message);
      await load(userId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("match.errConfirmAttend")
      );
    } finally {
      setAttendBusy(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!matchId || !userId) return;
    setPayBusy(userId);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("submit_payment", {
        target_match_id: matchId,
      });
      if (rpcError) throw new Error(rpcError.message);
      await load(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.errPay"));
    } finally {
      setPayBusy(null);
    }
  };

  const handleConfirmPayment = async (targetUserId: string, confirmed: boolean) => {
    if (!matchId || !userId) return;
    setPayBusy(targetUserId);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("confirm_payment", {
        target_match_id: matchId,
        target_user_id: targetUserId,
        confirmed,
      });
      if (rpcError) throw new Error(rpcError.message);
      await load(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.errPay"));
    } finally {
      setPayBusy(null);
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
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push(`/dashboard/groups/${groupId ?? ""}`);
              }
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-lime-400 transition hover:text-lime-300"
          >
            <ChevronLeft size={14} strokeWidth={2} />
            {t("match.back")}
          </button>

          {match && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h1 className="text-[28px] font-semibold leading-tight">
                {t("match.title")}
              </h1>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <EditMatchPanel
                    match={match}
                    onSaved={() => {
                      if (userId) void load(userId);
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
              <div className="flex items-start justify-between gap-4">
                <div className="shrink-0">
                  <p className="text-xl font-semibold leading-tight">
                    {relativeDayLabel(match.date)}
                  </p>
                  <p className="mt-1 text-[15px] text-slate-400">
                    {formatDate(match.date, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="inline-flex items-center gap-1.5 text-xl font-semibold leading-tight text-lime-300">
                    <Clock size={18} strokeWidth={2} />
                    {match.time.slice(0, 5)}
                    {match.endTime ? ` – ${match.endTime.slice(0, 5)}` : ""}
                  </p>
                  <p className="mt-1 flex items-center justify-end gap-1.5 text-base font-medium text-slate-100">
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
              </div>

              {match.locationUrl && (
                <div className="mt-4">
                  <MapsPreview url={match.locationUrl} />
                </div>
              )}
            </section>

            {myRsvp?.status === "pending" && (
              <section className="glass-panel rounded-2xl border-lime-500/40 bg-lime-500/5 p-5">
                <div className="mb-1 flex items-center gap-2">
                  <UserPlus
                    size={18}
                    strokeWidth={1.75}
                    className="text-lime-400"
                  />
                  <h2 className="text-base font-semibold">
                    {t("match.confirmAttendTitle")}
                  </h2>
                </div>
                <p className="mb-4 text-sm text-slate-300">
                  {t("match.confirmAttendBody")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={attendBusy}
                    onClick={() => handleConfirmAttendance(true)}
                    className="rounded-xl bg-lime-500 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                  >
                    {t("match.confirmAttendYes")}
                  </button>
                  <button
                    type="button"
                    disabled={attendBusy}
                    onClick={() => handleConfirmAttendance(false)}
                    className="rounded-xl border border-slate-700 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 active:scale-95 disabled:opacity-60"
                  >
                    {t("match.confirmAttendNo")}
                  </button>
                </div>
              </section>
            )}

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

            {match.status === "closed" && payments.length > 0 && (
              <PaymentStatusList
                payments={payments}
                currentUserId={userId}
                payeeId={payeeId}
                isAdmin={isAdmin}
                busyId={payBusy}
                onSubmit={handleSubmitPayment}
                onConfirm={handleConfirmPayment}
              />
            )}

            {isAdmin && (
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

            {isAdmin && (
              <section className="glass-panel rounded-2xl p-5">
                <div className="mb-2 flex items-center gap-2">
                  <UserPlus
                    size={18}
                    strokeWidth={1.75}
                    className="text-lime-400"
                  />
                  <h2 className="text-base font-semibold">
                    {t("match.addAttendeeTitle")}
                  </h2>
                </div>
                <p className="mb-3 text-xs text-slate-400">
                  {t("match.addAttendeeHint")}
                </p>

                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <SelectField
                      value={addUserId}
                      onChange={setAddUserId}
                      placeholder={t("match.addAttendeePick")}
                      options={addableMembers.map((m) => ({
                        value: m.userId,
                        label: m.name,
                      }))}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={addBusy || !addUserId}
                    onClick={async () => {
                      await handleAddAttendee(addUserId);
                      setAddUserId("");
                    }}
                    className="shrink-0 rounded-xl bg-lime-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    {t("match.addAttendeeBtn")}
                  </button>
                </div>
                {addableMembers.length === 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    {t("match.addAttendeeEmpty")}
                  </p>
                )}

                {pendingList.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-white/10 pt-3">
                    {pendingList.map((p) => (
                      <li
                        key={p.userId}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate text-slate-200">
                          {p.name}
                        </span>
                        <span className="shrink-0 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                          {t("match.attendeePending")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}

function PaymentStatusList({
  payments,
  currentUserId,
  payeeId,
  isAdmin,
  busyId,
  onSubmit,
  onConfirm,
}: {
  payments: Payment[];
  currentUserId: string | null;
  payeeId: string | null;
  isAdmin: boolean;
  busyId: string | null;
  onSubmit: () => void;
  onConfirm: (userId: string, confirmed: boolean) => void;
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
        <h2 className="text-base font-semibold">{t("match.payStatusTitle")}</h2>
      </div>
      <ul className="space-y-2">
        {payments.map((p) => {
          const isSelf = p.userId === currentUserId;
          const isPayee = p.userId === payeeId;
          const busy = busyId === p.userId;
          return (
            <li
              key={p.userId}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-100">
                  {p.name}
                  {p.tag && <span className="text-lime-400">#{p.tag}</span>}
                  {isSelf && (
                    <span className="ml-1 text-xs text-slate-500">
                      {t("members.you")}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">{formatVnd(p.amount)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isPayee ? (
                  <span className="rounded-full bg-lime-500/15 px-2.5 py-1 text-[11px] font-semibold text-lime-300">
                    {t("match.payCollector")}
                  </span>
                ) : (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill[p.status].cls}`}
                  >
                    {pill[p.status].label}
                  </span>
                )}
                {isSelf && !isPayee && p.status === "unpaid" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onSubmit}
                    className="rounded-lg bg-lime-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                  >
                    {t("match.payIPaid")}
                  </button>
                )}
                {isAdmin && !isPayee && p.status === "submitted" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onConfirm(p.userId, true)}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                  >
                    {t("match.payConfirm")}
                  </button>
                )}
                {isAdmin && !isPayee && p.status === "confirmed" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onConfirm(p.userId, false)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 active:scale-95 disabled:opacity-60"
                  >
                    {t("match.payUnconfirm")}
                  </button>
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

  // Only an admin-uploaded QR is shown; otherwise just the text details.
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
        {thousands > 0 ? `= ${formatVnd(thousands * 1000)}` : " "}
      </p>
    </div>
  );
}
