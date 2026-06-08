"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import DateField from "@/components/DateField";
import TimeField from "@/components/TimeField";

type Props = {
  // The match is always created for this specific group, so there is no
  // group picker — the trigger lives inline inside that group's card.
  groupId: string;
  onCreated: () => void;
};

export default function CreateMatchPanel({ groupId, onCreated }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [courtNo, setCourtNo] = useState("");
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setDate("");
    setTime("");
    setEndTime("");
    setLocation("");
    setLocationUrl("");
    setCourtNo("");
    setRepeatWeekly(false);
    setError("");
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!date || !time || !endTime || !location.trim()) {
      setError(t("matches.errRequired"));
      return;
    }
    if (endTime <= time) {
      setError(t("matches.errEndTime"));
      return;
    }

    const trimmedUrl = locationUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      setError(t("matches.errMapsUrl"));
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
        match_end_time: endTime,
        location: location.trim(),
        location_url: trimmedUrl || null,
        court_no: courtNo ? Number(courtNo) : null,
        created_by: uid,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Weekly repeat: store a schedule; an hourly cron materializes each
      // next occurrence ~3 days ahead. Manage/cancel in group settings.
      if (repeatWeekly) {
        const weekday = new Date(`${date}T00:00:00`).getDay();
        const { error: scheduleError } = await supabase
          .from("recurring_schedules")
          .insert({
            group_id: groupId,
            weekday,
            match_time: time,
            match_end_time: endTime,
            location: location.trim(),
            location_url: trimmedUrl || null,
            court_no: courtNo ? Number(courtNo) : null,
            created_by: uid,
          });
        if (scheduleError) {
          throw new Error(scheduleError.message);
        }
      }

      close();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("matches.errCreate"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-lime-500/30 bg-lime-500/[0.06] px-3 py-2 text-sm font-semibold text-lime-300 transition hover:border-lime-500/50 hover:bg-lime-500/10 active:scale-[0.99]"
        onClick={() => setOpen(true)}
      >
        <Plus size={15} strokeWidth={2.25} />
        {t("createMatch.fab")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              close();
            }
          }}
        >
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {t("matches.modalTitle")}
              </h2>
              <button
                type="button"
                className="text-sm text-slate-400 hover:text-slate-200"
                onClick={close}
              >
                {t("common.close")}
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1 text-sm">
                <label className="text-slate-300">{t("matches.date")}</label>
                <DateField value={date} onChange={setDate} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 text-sm">
                  <label className="text-slate-300">
                    {t("matches.timeStart")}
                  </label>
                  <TimeField value={time} onChange={setTime} required />
                </div>
                <div className="space-y-1 text-sm">
                  <label className="text-slate-300">
                    {t("matches.timeEnd")}
                  </label>
                  <TimeField value={endTime} onChange={setEndTime} required />
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-300">
                  {t("matches.location")}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                  placeholder={t("matches.locationPlaceholder")}
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-300">
                  {t("matches.courtNo")}{" "}
                  <span className="text-xs text-slate-500">
                    {t("matches.optional")}
                  </span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                  placeholder="3"
                  value={courtNo}
                  onChange={(event) => setCourtNo(event.target.value)}
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-300">
                  {t("matches.mapsLink")}{" "}
                  <span className="text-xs text-slate-500">
                    {t("matches.optional")}
                  </span>
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

              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-lime-500"
                  checked={repeatWeekly}
                  onChange={(event) => setRepeatWeekly(event.target.checked)}
                />
                <span>
                  <span className="font-medium text-slate-100">
                    {t("matches.repeatWeekly")}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {t("matches.repeatWeeklyHint")}
                  </span>
                </span>
              </label>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
                  onClick={close}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? t("matches.creating") : t("matches.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
