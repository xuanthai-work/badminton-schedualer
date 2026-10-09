"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import { useConfirm } from "@/components/ConfirmProvider";
import EmptyState from "@/components/EmptyState";
import BottomNav from "@/components/BottomNav";

type Venue = {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  mapsUrl: string | null;
};

export default function VenuesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const confirm = useConfirm();

  const [userId, setUserId] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");

  const load = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("venues")
      .select("id, user_id, name, address, maps_url")
      .order("name", { ascending: true });
    if (queryError) throw queryError;
    setVenues(
      (data ?? []).map((row) => ({
        id: row.id as string,
        userId: row.user_id as string,
        name: row.name as string,
        address: (row.address as string | null) ?? null,
        mapsUrl: (row.maps_url as string | null) ?? null,
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
        setUserId(data.session.user.id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("venues.loadError"));
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, load, t]);

  const openAdd = () => {
    setEditingId(null);
    setName("");
    setAddress("");
    setMapsUrl("");
    setError("");
    setOpen(true);
  };

  const openEdit = (venue: Venue) => {
    setEditingId(venue.id);
    setName(venue.name);
    setAddress(venue.address ?? "");
    setMapsUrl(venue.mapsUrl ?? "");
    setError("");
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setEditingId(null);
    setError("");
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("venues.errName"));
      return;
    }
    const trimmedUrl = mapsUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      setError(t("venues.errMapsUrl"));
      return;
    }

    const isDuplicate = venues.some(
      (v) =>
        v.id !== editingId &&
        v.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setError(t("venues.errDuplicate"));
      return;
    }

    setBusy(true);
    setError("");
    try {
      const payload = {
        user_id: userId,
        name: trimmedName,
        address: address.trim() || null,
        maps_url: trimmedUrl || null,
        updated_at: new Date().toISOString(),
      };
      const { error: saveError } = editingId
        ? await supabase.from("venues").update(payload).eq("id", editingId)
        : await supabase.from("venues").insert(payload);
      if (saveError) throw new Error(saveError.message);
      close();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("venues.errSave"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (venue: Venue) => {
    if (
      !(await confirm({
        message: t("venues.deleteConfirm", { name: venue.name }),
        confirmLabel: t("common.confirm"),
        destructive: true,
      }))
    )
      return;
    try {
      const { error: deleteError } = await supabase
        .from("venues")
        .delete()
        .eq("id", venue.id);
      if (deleteError) throw new Error(deleteError.message);
      setVenues((prev) => prev.filter((v) => v.id !== venue.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("venues.errDelete"));
    }
  };

  // Live "similar venue" hint while typing a new name.
  const trimmedQuery = name.trim().toLowerCase();
  const similarVenue =
    trimmedQuery.length > 0
      ? venues.find(
          (v) => v.id !== editingId && v.name.toLowerCase().includes(trimmedQuery)
        )
      : undefined;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 pb-28 text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-80px] h-80 w-80 rounded-full bg-lime-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/profile")}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-lime-400 transition hover:text-lime-300"
          >
            <ChevronLeft size={14} strokeWidth={2} />
            {t("profile.account")}
          </button>
          <h1 className="text-[28px] font-semibold leading-tight">
            {t("venues.title")}
          </h1>
          <p className="text-xs text-slate-400">{t("venues.subtitle")}</p>
        </header>

        <button
          type="button"
          onClick={openAdd}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-500 px-4 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.3)] transition hover:scale-[1.01] active:scale-[0.99]"
        >
          <Plus size={16} strokeWidth={2.5} />
          {t("venues.addVenue")}
        </button>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        {loading ? (
          <div className="glass-panel h-32 animate-pulse rounded-2xl" />
        ) : venues.length === 0 ? (
          <EmptyState icon={MapPin} message={t("venues.emptyList")} />
        ) : (
          <ul className="space-y-3">
            {venues.map((venue) => (
              <li
                key={venue.id}
                className="glass-panel flex items-start justify-between gap-3 rounded-2xl p-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500/10 text-lime-300">
                    <MapPin size={16} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-100">
                      <span className="truncate">{venue.name}</span>
                      {venue.userId === userId && (
                        <span className="shrink-0 rounded-full bg-lime-500/15 px-2 py-0.5 text-[10px] font-semibold text-lime-300">
                          {t("venues.myVenueBadge")}
                        </span>
                      )}
                    </p>
                    {venue.address && (
                      <p className="truncate text-xs text-slate-400">
                        {venue.address}
                      </p>
                    )}
                    {venue.mapsUrl && (
                      <a
                        href={venue.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-lime-300 transition hover:text-lime-200"
                      >
                        <ExternalLink size={11} strokeWidth={2} />
                        {t("match.openMaps")}
                      </a>
                    )}
                  </div>
                </div>
                {venue.userId === userId && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(venue)}
                      aria-label={t("venues.editVenue")}
                      className="rounded-lg border border-slate-700 p-1.5 text-slate-200 transition hover:border-lime-500/50 hover:text-lime-300 active:scale-95"
                    >
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(venue)}
                      aria-label={t("venues.delete")}
                      className="rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 active:scale-95"
                    >
                      <Trash2 size={15} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-md sm:items-center"
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              close();
            }
          }}
        >
          <div className="bg-slate-900 border border-slate-800/90 w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? t("venues.editVenue") : t("venues.addVenue")}
              </h2>
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
                <label className="text-slate-300">{t("venues.nameLabel")}</label>
                <input
                  autoFocus
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                  placeholder={t("venues.namePlaceholder")}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
                {similarVenue && (
                  <p className="text-[11px] text-amber-300">
                    💡 {t("venues.similarHint", { name: similarVenue.name })}
                  </p>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-300">
                  {t("venues.addressLabel")}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                  placeholder={t("venues.addressPlaceholder")}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-300">
                  {t("venues.mapsUrlLabel")}
                </label>
                <input
                  type="url"
                  inputMode="url"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                  placeholder="https://maps.app.goo.gl/..."
                  value={mapsUrl}
                  onChange={(event) => setMapsUrl(event.target.value)}
                />
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
                  disabled={busy}
                >
                  {busy ? t("venues.saving") : t("venues.save")}
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
