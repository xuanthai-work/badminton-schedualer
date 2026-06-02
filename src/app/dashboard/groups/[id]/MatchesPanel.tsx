"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Match = {
  id: string;
  date: string;
  time: string;
  location: string;
  status: "open" | "closed";
  yesCount: number;
};

type Props = {
  groupId: string;
  isAdmin: boolean;
};

export default function MatchesPanel({ groupId, isAdmin }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data, error: queryError } = await supabase
        .from("matches")
        .select("id, match_date, match_time, location, status, rsvps(status)")
        .eq("group_id", groupId)
        .order("match_date", { ascending: false })
        .order("match_time", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      const mapped: Match[] =
        data?.map((row) => {
          const rsvps = Array.isArray(row.rsvps) ? row.rsvps : [];
          const yesCount = rsvps.filter((r) => r.status === "yes").length;
          return {
            id: row.id,
            date: row.match_date,
            time: row.match_time,
            location: row.location,
            status: row.status === "closed" ? "closed" : "open",
            yesCount,
          };
        }) ?? [];

      setMatches(mapped);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải lịch.");
    }
  }, [groupId]);

  useEffect(() => {
    const run = async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [load]);

  const reset = () => {
    setDate("");
    setTime("");
    setLocation("");
    setFormError("");
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!date || !time || !location.trim()) {
      setFormError("Vui lòng nhập đủ ngày, giờ và địa điểm.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      const { error: insertError } = await supabase.from("matches").insert({
        group_id: groupId,
        match_date: date,
        match_time: time,
        location: location.trim(),
        created_by: uid,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setOpen(false);
      reset();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Tạo lịch thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lịch đánh</h2>
        {isAdmin && (
          <button
            type="button"
            className="rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950"
            onClick={() => setOpen(true)}
          >
            + Tạo lịch
          </button>
        )}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {loading ? (
        <div className="glass-panel h-24 animate-pulse rounded-2xl" />
      ) : matches.length === 0 ? (
        <div className="glass-panel rounded-2xl p-6 text-sm text-slate-300">
          Chưa có lịch nào. {isAdmin && "Bấm Tạo lịch để bắt đầu."}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {matches.map((match) => (
            <li key={match.id}>
              <Link
                href={`/dashboard/groups/${groupId}/matches/${match.id}`}
                className="glass-panel block rounded-2xl p-4 transition hover:border-lime-500/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">
                      {formatDate(match.date)} · {match.time.slice(0, 5)}
                    </p>
                    <p className="mt-1 text-base font-medium">{match.location}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      match.status === "open"
                        ? "bg-lime-500/20 text-lime-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {match.status === "open" ? "Mở" : "Đã chốt"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  {match.yesCount} người tham gia
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              setOpen(false);
              reset();
            }
          }}
        >
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Tạo lịch đánh</h3>
              <button
                type="button"
                className="text-sm text-slate-400 hover:text-slate-200"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Đóng
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 text-sm">
                  <label className="text-slate-300">Ngày</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <label className="text-slate-300">Giờ</label>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-300">Sân / Địa điểm</label>
                <input
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                  placeholder="Ví dụ: Sân Phú Mỹ Hưng - Sân 3"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                />
              </div>

              {formError && <p className="text-xs text-rose-400">{formError}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                >
                  Hủy
                </button>
                <button
                  className="rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? "Đang tạo..." : "Tạo lịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
