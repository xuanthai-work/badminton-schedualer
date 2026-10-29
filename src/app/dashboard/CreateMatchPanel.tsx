"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import DateField from "@/components/DateField";
import TimeField from "@/components/TimeField";
import SelectField from "@/components/SelectField";

type Props = {
  onCreated?: () => void;
};

type Venue = {
  id: string;
  name: string;
  address: string | null;
  mapsUrl: string | null;
};

export default function CreateMatchPanel({ onCreated }: Props) {
  const router = useRouter();
  const { t, formatDate } = useI18n();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venueId, setVenueId] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setDate("");
    setTime("");
    setEndTime("");
    setVenueId("");
    setError("");
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  // Load the host's saved venues each time the modal opens.
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
      setVenues(
        (data ?? []).map((row) => ({
          id: row.id as string,
          name: row.name as string,
          address: (row.address as string | null) ?? null,
          mapsUrl: (row.maps_url as string | null) ?? null,
        }))
      );
      setVenuesLoading(false);
    };
    void run();
    return () => {
      active = false;
    };
  }, [open]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!date || !time || !endTime) {
      setError(t("matches.errRequired"));
      return;
    }
    if (endTime <= time) {
      setError(t("matches.errEndTime"));
      return;
    }

    const selectedVenue = venueId ? venues.find((v) => v.id === venueId) : null;
    if (venueId && !selectedVenue) {
      setError(t("venues.selectVenue"));
      return;
    }
    const location = selectedVenue ? selectedVenue.name : t("venues.unselected");
    const locationUrl = selectedVenue ? selectedVenue.mapsUrl ?? null : null;

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        throw new Error(t("matches.errCreate"));
      }

      const title = formatDate(date, {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const { data, error: insertError } = await supabase
        .from("matches")
        .insert({
          title,
          match_date: date,
          match_time: time,
          match_end_time: endTime,
          location,
          location_url: locationUrl,
          created_by: uid,
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Auto-add the host to the participant list so a fresh match already
      // shows one attendee (and the host never owes themselves).
      if (data?.id) {
        const { data: hostProfile } = await supabase
          .from("users")
          .select("name")
          .eq("id", uid)
          .maybeSingle();
        const hostName =
          hostProfile?.name?.trim() ||
          userData.user?.email?.split("@")[0] ||
          "Host";
        await supabase.rpc("guest_rsvp", {
          p_match_id: data.id,
          p_guest_id: uid,
          p_name: hostName,
          p_status: "yes",
          p_secret: null,
        });
      }

      close();
      onCreated?.();
      if (data?.id) {
        router.push(`/dashboard/matches/${data.id}`);
      }
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
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-500 px-4 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.3)] transition hover:scale-[1.01] active:scale-[0.99]"
        onClick={() => setOpen(true)}
      >
        <Plus size={16} strokeWidth={2.5} />
        {t("dashboard.createMatchCta")}
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
            onClick={(event) => {
              if (event.currentTarget === event.target) {
                close();
              }
            }}
          >
            <div className="bg-slate-900 border border-slate-800/90 flex flex-col min-h-[480px] sm:min-h-[500px] max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {t("matches.createTitle")}
                </h2>
                <button
                  type="button"
                  className="text-sm text-slate-400 hover:text-slate-200"
                  onClick={close}
                >
                  {t("common.close")}
                </button>
              </div>

              <form onSubmit={handleCreate} className="flex flex-1 flex-col space-y-4">
                <div className="space-y-1 text-sm">
                  <label className="text-slate-300">{t("matches.date")}</label>
                  <DateField value={date} onChange={setDate} required />
                  {date && (
                    <p className="ml-1 text-[11px] text-lime-300/80">
                      {t("matches.autoTitle", {
                        title: formatDate(date, {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }),
                      })}
                    </p>
                  )}
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
                    <label className="text-slate-300">
                      {t("matches.location")}
                    </label>
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
                      onChange={setVenueId}
                      placeholder={t("venues.selectVenue")}
                      options={[
                        { value: "", label: t("venues.unselected") },
                        ...venues.map((v) => ({ value: v.id, label: v.name })),
                      ]}
                    />
                  )}
                </div>

                {error && <p className="text-xs text-rose-400">{error}</p>}

                <div className="mt-auto flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
                    onClick={close}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                    disabled={submitting}
                  >
                    {submitting ? t("matches.creating") : t("matches.create")}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
