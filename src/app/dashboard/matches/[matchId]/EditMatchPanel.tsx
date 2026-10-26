"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import DateField from "@/components/DateField";
import TimeField from "@/components/TimeField";
import SelectField from "@/components/SelectField";

type Venue = {
  id: string;
  name: string;
  address: string | null;
  mapsUrl: string | null;
};

// Synthetic option used when the match's venue is not saved in `venues` yet.
const CURRENT_VENUE_ID = "__current_match_venue__";

type EditableMatch = {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime: string | null;
  location: string;
  locationUrl: string | null;
};

type Props = {
  match: EditableMatch;
  onSaved: () => void;
};

export default function EditMatchPanel({ match, onSaved }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venueId, setVenueId] = useState("");
  const [initialVenueId, setInitialVenueId] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Prefill from the latest match on every open (realtime may have changed it).
  const openModal = () => {
    setTitle(match.title);
    setDate(match.date);
    setTime(match.time.slice(0, 5));
    setEndTime(match.endTime ? match.endTime.slice(0, 5) : "");
    setError("");
    setOpen(true);
  };

  const close = () => setOpen(false);

  // Load the host's saved venues when the modal opens and preselect the one
  // matching the current location. A location that is not in the list yet is
  // offered as a synthetic option so the match never loses its venue.
  useEffect(() => {
    if (!open) return;
    let active = true;
    const run = async () => {
      setVenuesLoading(true);
      const { data } = await supabase
        .from("venues")
        .select("id, name, address, maps_url")
        .order("name", { ascending: true });
      if (!active) return;
      const list: Venue[] = (data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        address: (row.address as string | null) ?? null,
        mapsUrl: (row.maps_url as string | null) ?? null,
      }));
      const isUnselected = match.location.trim() === t("venues.unselected");
      const matched = list.find((v) => v.name === match.location);
      const currentName = match.location.trim();
      if (!matched && currentName && !isUnselected) {
        list.push({
          id: CURRENT_VENUE_ID,
          name: currentName,
          address: null,
          mapsUrl: match.locationUrl ?? null,
        });
      }
      setVenues(list);
      const resolvedId =
        matched?.id ?? (currentName && !isUnselected ? CURRENT_VENUE_ID : "");
      setVenueId(resolvedId);
      setInitialVenueId(resolvedId);
      setVenuesLoading(false);
    };
    void run();
    return () => {
      active = false;
    };
  }, [open, match.location, match.locationUrl, t]);

  const handleVenueChange = (id: string) => {
    setVenueId(id);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!title.trim() || !date || !time || !endTime) {
      setError(t("matches.errRequired"));
      return;
    }
    const chosenVenue = venueId ? venues.find((v) => v.id === venueId) : null;
    if (venueId && !chosenVenue) {
      setError(t("venues.selectVenue"));
      return;
    }
    if (endTime <= time) {
      setError(t("matches.errEndTime"));
      return;
    }
    // The maps link always comes from the venue. Keeping the match's existing
    // link when the venue did not change preserves legacy matches.
    const locationUrl =
      venueId !== "" && chosenVenue
        ? venueId === initialVenueId
          ? match.locationUrl ?? chosenVenue.mapsUrl ?? null
          : chosenVenue.mapsUrl ?? null
        : null;

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("matches")
        .update({
          title: title.trim(),
          match_date: date,
          match_time: time,
          match_end_time: endTime,
          location: chosenVenue ? chosenVenue.name : t("venues.unselected"),
          location_url: locationUrl,
          court_no: null,
        })
        .eq("id", match.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      close();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("match.errUpdate"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={t("match.editBtn")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-lime-500/50 hover:text-lime-300 active:scale-95"
        onClick={openModal}
      >
        <Pencil size={12} strokeWidth={2} />
        {t("match.editBtn")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              close();
            }
          }}
        >
          <div className="bg-slate-900 border border-slate-800/90 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("match.editTitle")}</h2>
              <button
                type="button"
                className="text-sm text-slate-400 hover:text-slate-200"
                onClick={close}
              >
                {t("common.close")}
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1 text-sm">
                <label className="text-slate-300">
                  {t("matches.titleLabel")}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                  placeholder={t("matches.titlePlaceholder")}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>
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
                <div className="flex items-center justify-between gap-2">
                  <label className="text-slate-300">{t("matches.location")}</label>
                  <Link
                    href="/dashboard/venues"
                    className="text-[11px] font-semibold text-lime-300 transition hover:text-lime-200"
                  >
                    {t("venues.manageVenues")}
                  </Link>
                </div>
                  {venuesLoading ? (
                    <div className="h-12 animate-pulse rounded-xl bg-slate-800/40" />
                  ) : (
                    <SelectField
                      value={venueId}
                      onChange={handleVenueChange}
                      placeholder={t("venues.selectVenue")}
                      options={[
                        { value: "", label: t("venues.unselected") },
                        ...venues.map((v) => ({ value: v.id, label: v.name })),
                      ]}
                    />
                  )}
                </div>

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
                  {submitting ? t("match.saving") : t("match.editSave")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
