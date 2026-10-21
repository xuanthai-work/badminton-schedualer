"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  Clock,
  MapPin,
  ReceiptText,
  Share2,
  Trash2,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import { triggerHaptic } from "@/lib/haptics";
import BottomNav from "@/components/BottomNav";
import PullToRefresh from "@/components/PullToRefresh";
import MapsPreview from "@/components/MapsPreview";
import InitialAvatar from "@/components/InitialAvatar";
import { useConfirm } from "@/components/ConfirmProvider";
import EditMatchPanel from "./EditMatchPanel";

type Guest = {
  guestId: string;
  name: string;
  status: "yes" | "no";
  paymentStatus: PaymentStatus;
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

type PaymentStatus = "unpaid" | "submitted" | "confirmed";

export default function MatchDetailPage() {
  const router = useRouter();
  const { t, formatVnd, formatMatchHeading } = useI18n();
  const confirm = useConfirm();
  const params = useParams<{ matchId: string }>();
  const matchId = params?.matchId;

  const [userId, setUserId] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [payBusy, setPayBusy] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [courtFee, setCourtFee] = useState("");
  const [tubePrice, setTubePrice] = useState("");
  const [shuttleCount, setShuttleCount] = useState("");
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

  // Re-sync when the tab becomes visible again (mobile browsers sleep sockets).
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  const isHost = Boolean(match && userId && match.createdBy === userId);

  const guestYes = guests.filter((g) => g.status === "yes");
  const attendeeCount = guestYes.length;

  // Shuttle cost is derived from tube price + shuttle count; falls back to the
  // stored total when the host hasn't entered the tube/count pair.
  const tubePriceNum = Number(tubePrice) || 0;
  const shuttleCountNum = Number(shuttleCount) || 0;
  const shuttleFeeCalculated =
    tubePriceNum > 0 && shuttleCountNum > 0
      ? Math.round(((tubePriceNum * 1000) / 12) * shuttleCountNum)
      : (Number(shuttleFee) || 0) * 1000;
  const courtFeeTotal = (Number(courtFee) || 0) * 1000;
  const waterFeeTotal = (Number(waterFee) || 0) * 1000;
  const totalCost = courtFeeTotal + shuttleFeeCalculated + waterFeeTotal;
  const feePerPersonPreview =
    attendeeCount > 0 ? Math.round(totalCost / attendeeCount) : 0;

  const handleSettle = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!matchId || !userId) return;

    setSettleBusy(true);
    setSettleMsg("");
    setError("");
    try {
      const court = courtFeeTotal;
      const shuttle = shuttleFeeCalculated;
      const water = waterFeeTotal;
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
      // Jump straight to the ledger with this match auto-expanded so the host
      // sees the collection table and VietQR right away.
      triggerHaptic("success");
      router.push(`/dashboard/debts?matchId=${matchId}`);
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

  const handleRemoveGuest = async () => {
    if (!guestToDelete) return;
    setDeleting(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("host_remove_guest", {
        p_match_id: matchId,
        p_guest_id: guestToDelete.guestId,
      });
      if (rpcError) throw new Error(rpcError.message);
      setGuestToDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.errRemoveGuest"));
    } finally {
      setDeleting(false);
    }
  };

  const handleAddGuest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!matchId || !userId) return;
    const name = newGuestName.trim();
    if (!name) {
      setError(t("match.errNameEmpty"));
      return;
    }
    setAddingGuest(true);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("host_add_guest", {
        p_match_id: matchId,
        p_name: name,
      });
      if (rpcError) {
        if (rpcError.message?.includes("match_full")) {
          throw new Error(t("publicMatch.matchFullError"));
        }
        throw new Error(rpcError.message);
      }
      triggerHaptic("success");
      setNewGuestName("");
      setShowAddGuestModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ledger.actionError"));
    } finally {
      setAddingGuest(false);
    }
  };

  const handleToggleEditFee = async () => {
    if (isEditingFee) {
      setIsEditingFee(false);
      return;
    }
    const paidCount = guests.filter(
      (g) =>
        g.status === "yes" &&
        g.paymentStatus === "confirmed" &&
        g.guestId !== userId
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
    setIsEditingFee(true);
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

      <PullToRefresh onRefresh={load}>
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
                {formatMatchHeading(match.date)}
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
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
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

            <ParticipantList
              title={t("match.joinList", { count: guestYes.length })}
              guests={guestYes}
              status={match.status}
              feePerPerson={expense?.feePerPerson ?? 0}
              isHost={isHost}
              userId={userId}
              busyId={payBusy}
              onConfirm={handleConfirmGuest}
              onRequestDelete={(g) => setGuestToDelete(g)}
              onOpenAddGuest={() => {
                setNewGuestName("");
                setShowAddGuestModal(true);
              }}
              emptyLabel={t("match.nobody")}
            />

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

                {isHost && match.status === "closed" && (
                  <button
                    type="button"
                    onClick={() => void handleToggleEditFee()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/60 py-2 text-xs font-semibold text-slate-300 transition hover:border-lime-500/50 hover:text-lime-300 active:scale-95"
                  >
                    <ReceiptText size={14} />
                    {isEditingFee
                      ? t("match.cancelEditCosts")
                      : t("match.editCosts")}
                  </button>
                )}
              </section>
            )}

            {isHost && (match.status === "open" || isEditingFee) && (
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
                    = {t("match.shuttleFee")}:{" "}
                    {formatVnd(shuttleFeeCalculated)}
                  </p>
                  <FeeInput
                    label={t("match.waterFee")}
                    value={waterFee}
                    onChange={setWaterFee}
                    placeholder="50"
                  />
                  <div className="space-y-2 rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{t("match.total")}</span>
                      <span className="font-semibold text-slate-100">
                        {formatVnd(totalCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/10 pt-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-lime-400">
                        {t("ledger.perPerson")} (
                        {t("ledger.peopleCount", { count: attendeeCount })})
                      </span>
                      <span className="text-xl font-bold text-lime-300">
                        {formatVnd(feePerPersonPreview)}
                      </span>
                    </div>
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
      </PullToRefresh>

      {guestToDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-md sm:items-center">
          <div className="bg-slate-900 border border-slate-800/90 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">
              {t("match.removeGuestTitle")}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {guestToDelete.guestId === userId
                ? t("match.removeSelfBody")
                : t("match.removeGuestBody", { name: guestToDelete.name })}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleRemoveGuest()}
                className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 active:scale-95 disabled:opacity-60"
              >
                {t("match.removeGuestBtn")}
              </button>
              <button
                type="button"
                onClick={() => setGuestToDelete(null)}
                className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 active:scale-95"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddGuestModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-md sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-800/90 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">
              {t("match.addGuestTitle")}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {t("match.addGuestHint")}
            </p>
            <form onSubmit={handleAddGuest} className="mt-4 space-y-4">
              <input
                autoFocus
                value={newGuestName}
                onChange={(event) => setNewGuestName(event.target.value)}
                placeholder={t("match.addGuestPlaceholder")}
                maxLength={60}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addingGuest}
                  className="flex-1 rounded-xl bg-lime-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                >
                  {addingGuest ? t("match.saving") : t("common.confirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGuestModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 active:scale-95"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function ParticipantList({
  title,
  guests,
  status,
  feePerPerson,
  isHost,
  userId,
  busyId,
  onConfirm,
  onRequestDelete,
  onOpenAddGuest,
  emptyLabel,
}: {
  title: string;
  guests: Guest[];
  status: "open" | "closed";
  feePerPerson: number;
  isHost: boolean;
  userId: string | null;
  busyId: string | null;
  onConfirm: (guestId: string, confirmed: boolean) => void;
  onRequestDelete: (guest: Guest) => void;
  onOpenAddGuest: () => void;
  emptyLabel: string;
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
    <section className="glass-panel rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-300">
          {title}
        </p>
        {isHost && (
          <button
            type="button"
            onClick={onOpenAddGuest}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-lime-400 transition hover:border-lime-500/50 hover:bg-slate-800 active:scale-95"
          >
            <UserPlus size={13} strokeWidth={2} />
            {t("match.addGuestBtn")}
          </button>
        )}
      </div>
      {guests.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {guests.map((g) => {
            const busy = busyId === g.guestId;
            const isSelf = g.guestId === userId;
            // The host collects the money, so their own share is always paid.
            const paymentStatus: PaymentStatus = isSelf
              ? "confirmed"
              : g.paymentStatus;
            return (
              <li
                key={g.guestId}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/50 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <InitialAvatar name={g.name} size={32} />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-100">{g.name}</p>
                    {status === "closed" && (
                      <p className="text-xs text-slate-500">
                        {formatVnd(feePerPerson)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {status === "closed" && (
                    <>
                      {isHost && !isSelf ? (
                        paymentStatus === "confirmed" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onConfirm(g.guestId, false)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/30 active:scale-95 disabled:opacity-60"
                          >
                            <Check size={12} strokeWidth={2.25} />
                            {t("match.payConfirmed")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onConfirm(g.guestId, true)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                          >
                            <Check size={12} strokeWidth={2.25} />
                            {t("match.payConfirm")}
                          </button>
                        )
                      ) : (
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill[paymentStatus].cls}`}
                        >
                          {paymentStatus === "confirmed"
                            ? t("match.payConfirmed")
                            : pill[paymentStatus].label}
                        </span>
                      )}
                    </>
                  )}
                  {isHost && status === "open" && (
                    <button
                      type="button"
                      aria-label={t("match.removeGuestTitle")}
                      onClick={() => onRequestDelete(g)}
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
          className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 pr-16 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
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
