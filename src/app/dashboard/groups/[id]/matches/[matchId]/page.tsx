"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
        .select("id, group_id, match_date, match_time, location, status")
        .eq("id", matchId)
        .maybeSingle();

      if (matchError) throw matchError;
      if (!matchRow) throw new Error("Không tìm thấy lịch.");
      if (matchRow.group_id !== groupId) {
        throw new Error("Lịch không thuộc nhóm này.");
      }

      setMatch({
        id: matchRow.id,
        groupId: matchRow.group_id,
        date: matchRow.match_date,
        time: matchRow.match_time,
        location: matchRow.location,
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
            name: user?.name ?? "(không rõ)",
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
    [groupId, matchId]
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
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, load]);

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
      setError(err instanceof Error ? err.message : "Lỗi cập nhật RSVP.");
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
        throw new Error("Chi phí không được âm.");
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
          `Đã chốt: ${result.attendees ?? 0} người · ${formatVnd(result.fee_per_person ?? 0)} / người`
        );
      } else {
        setSettleMsg("Đã chốt.");
      }
      await load(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi chốt chi phí.");
    } finally {
      setSettleBusy(false);
    }
  };

  const handleReopen = async () => {
    if (!matchId || !userId) return;
    if (!confirm("Mở lại lịch này? Chi phí đã lưu sẽ giữ nguyên.")) return;
    setSettleBusy(true);
    try {
      const { error: updateError } = await supabase
        .from("matches")
        .update({ status: "open" })
        .eq("id", matchId);
      if (updateError) throw new Error(updateError.message);
      await load(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi mở lại lịch.");
    } finally {
      setSettleBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header>
          <Link
            href={`/dashboard/groups/${groupId ?? ""}`}
            className="text-xs uppercase tracking-[0.3em] text-lime-400 hover:text-lime-300"
          >
            ← Quay lại nhóm
          </Link>
          {match && (
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">{match.location}</h1>
                <p className="mt-1 text-sm text-slate-400">
                  {formatDate(match.date)} · {match.time.slice(0, 5)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  match.status === "open"
                    ? "bg-lime-500/20 text-lime-300"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {match.status === "open" ? "Đang mở" : "Đã chốt"}
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

            <section className="glass-panel space-y-3 rounded-2xl p-5">
              <h2 className="text-base font-semibold">RSVP của bạn</h2>
              {match.status === "closed" ? (
                <p className="text-sm text-slate-400">
                  Lịch đã đóng. Không thể đổi RSVP.
                </p>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      myRsvp?.status === "yes"
                        ? "bg-lime-500 text-slate-950"
                        : "border border-slate-700 text-slate-200 hover:border-lime-500/60"
                    } disabled:opacity-60`}
                    onClick={() => handleRsvp("yes")}
                    disabled={rsvpBusy}
                  >
                    Tham gia
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      myRsvp?.status === "no"
                        ? "bg-rose-500 text-slate-950"
                        : "border border-slate-700 text-slate-200 hover:border-rose-500/60"
                    } disabled:opacity-60`}
                    onClick={() => handleRsvp("no")}
                    disabled={rsvpBusy}
                  >
                    Nghỉ
                  </button>
                </div>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <RsvpList title={`Tham gia (${yesList.length})`} list={yesList} tone="lime" />
              <RsvpList title={`Nghỉ (${noList.length})`} list={noList} tone="rose" />
            </section>

            {expense && (
              <section className="glass-panel space-y-2 rounded-2xl p-5">
                <h2 className="text-base font-semibold">Chi phí</h2>
                <dl className="grid grid-cols-2 gap-y-1 text-sm text-slate-300">
                  <dt>Tiền sân</dt>
                  <dd className="text-right">{formatVnd(expense.courtFee)}</dd>
                  <dt>Tiền cầu</dt>
                  <dd className="text-right">{formatVnd(expense.shuttleFee)}</dd>
                  <dt>Tiền nước</dt>
                  <dd className="text-right">{formatVnd(expense.waterFee)}</dd>
                  <dt className="border-t border-slate-800 pt-1 font-semibold text-slate-200">
                    Tổng
                  </dt>
                  <dd className="border-t border-slate-800 pt-1 text-right font-semibold text-slate-100">
                    {formatVnd(expense.totalAmount)}
                  </dd>
                </dl>
                <p className="rounded-xl bg-lime-500/10 px-3 py-2 text-center text-sm text-lime-200">
                  Mỗi người trả {formatVnd(expense.feePerPerson)}
                </p>
              </section>
            )}

            {isAdmin && (
              <section className="glass-panel space-y-3 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">
                    {match.status === "open" ? "Chốt chi phí" : "Cập nhật chi phí"}
                  </h2>
                  {match.status === "closed" && (
                    <button
                      type="button"
                      onClick={handleReopen}
                      disabled={settleBusy}
                      className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-60"
                    >
                      Mở lại lịch
                    </button>
                  )}
                </div>
                <form onSubmit={handleSettle} className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <FeeInput
                      label="Tiền sân"
                      value={courtFee}
                      onChange={setCourtFee}
                    />
                    <FeeInput
                      label="Tiền cầu"
                      value={shuttleFee}
                      onChange={setShuttleFee}
                    />
                    <FeeInput
                      label="Tiền nước"
                      value={waterFee}
                      onChange={setWaterFee}
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    Hệ thống sẽ chia cho {yesList.length} người tham gia.
                  </p>
                  {settleMsg && <p className="text-xs text-lime-300">{settleMsg}</p>}
                  <button
                    className="w-full rounded-xl bg-lime-500 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                    disabled={settleBusy}
                  >
                    {settleBusy
                      ? "Đang lưu..."
                      : match.status === "open"
                        ? "Chốt và chia tiền"
                        : "Cập nhật chi phí"}
                  </button>
                </form>
              </section>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

function RsvpList({
  title,
  list,
  tone,
}: {
  title: string;
  list: Rsvp[];
  tone: "lime" | "rose";
}) {
  const toneClass = tone === "lime" ? "text-lime-300" : "text-rose-300";
  return (
    <div className="glass-panel rounded-2xl p-4">
      <p className={`text-xs uppercase tracking-wider ${toneClass}`}>{title}</p>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Chưa có ai.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-slate-200">
          {list.map((r) => (
            <li key={r.userId}>{r.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1 text-sm">
      <label className="text-slate-300">{label}</label>
      <input
        type="number"
        min={0}
        step="1000"
        className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
      />
    </div>
  );
}

function formatDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatVnd(value: number) {
  if (Number.isNaN(value)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
