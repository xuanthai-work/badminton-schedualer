"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Plus, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import DateField from "@/components/DateField";
import TimeField from "@/components/TimeField";

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
  const [locationUrl, setLocationUrl] = useState("");
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
    setLocationUrl("");
    setFormError("");
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!date || !time || !location.trim()) {
      setFormError("Vui lòng nhập đủ ngày, giờ và địa điểm.");
      return;
    }

    const trimmedUrl = locationUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      setFormError("Link Google Maps phải bắt đầu bằng http:// hoặc https://.");
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
        location_url: trimmedUrl || null,
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
            className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.25)] transition hover:scale-[1.02] active:scale-95"
            onClick={() => setOpen(true)}
          >
            <Plus size={16} strokeWidth={2.25} />
            Tạo lịch
          </button>
        )}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {loading ? (
        <div className="glass-panel h-40 animate-pulse rounded-2xl" />
      ) : matches.length === 0 ? (
        <div className="glass-panel rounded-2xl p-6 text-sm text-slate-300">
          Chưa có lịch nào. {isAdmin && "Bấm Tạo lịch để bắt đầu."}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <li key={match.id}>
              <Link
                href={`/dashboard/groups/${groupId}/matches/${match.id}`}
                className="glass-panel group flex h-full flex-col gap-4 rounded-2xl p-5 transition hover:border-lime-500/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        match.status === "open"
                          ? "text-lime-400"
                          : "text-slate-400"
                      }`}
                    >
                      {formatDate(match.date)}
                    </p>
                    <p className="text-xl font-semibold leading-tight">
                      {match.time.slice(0, 5)}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      match.status === "open"
                        ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                        : "border-white/10 bg-slate-800 text-slate-400"
                    }`}
                  >
                    {match.status === "open" ? "Đang mở" : "Đã chốt"}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <MapPin
                      size={16}
                      strokeWidth={1.75}
                      className="text-slate-400"
                    />
                    <span className="line-clamp-1">{match.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users
                      size={16}
                      strokeWidth={1.75}
                      className="text-slate-400"
                    />
                    <span>{match.yesCount} người tham gia</span>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-end border-t border-white/10 pt-3 text-xs font-semibold uppercase tracking-[0.18em] text-lime-400">
                  Chi tiết
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    className="ml-1 transition-transform group-hover:translate-x-1"
                  />
                </div>
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
                  <DateField value={date} onChange={setDate} required />
                </div>
                <div className="space-y-1 text-sm">
                  <label className="text-slate-300">Giờ</label>
                  <TimeField value={time} onChange={setTime} required />
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
              <div className="space-y-1 text-sm">
                <label className="text-slate-300">
                  Link Google Maps{" "}
                  <span className="text-xs text-slate-500">(tùy chọn)</span>
                </label>
                <input
                  type="url"
                  inputMode="url"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                  placeholder="https://maps.app.goo.gl/..."
                  value={locationUrl}
                  onChange={(event) => setLocationUrl(event.target.value)}
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
