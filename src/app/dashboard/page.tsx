"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  MapPin,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { ensureUserProfile } from "@/lib/userProfile";
import { useI18n } from "@/lib/i18n";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/ToastProvider";
import EmptyState from "@/components/EmptyState";
import BottomNav from "@/components/BottomNav";
import CreateMatchPanel from "./CreateMatchPanel";

type HostMatch = {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime: string | null;
  location: string;
  status: "open" | "closed";
  attendees: number;
};

type Tab = "upcoming" | "history";

export default function DashboardPage() {
  const router = useRouter();
  const { t, formatMatchHeading } = useI18n();
  const confirm = useConfirm();
  const toast = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [matches, setMatches] = useState<HostMatch[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // One-shot toast driven by ?notice=... (e.g. the bell redirects here when
  // a notification points at a deleted match). Cleans the URL immediately.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("notice") !== "match-gone") return;
    window.history.replaceState(null, "", "/dashboard");
    const show = window.setTimeout(
      () => toast(t("dashboard.matchGone"), "info"),
      0
    );
    return () => window.clearTimeout(show);
  }, [t, toast]);

  const loadMatches = useCallback(async (uid: string) => {
    const { data, error: queryError } = await supabase
      .from("matches")
      .select(
        "id, title, match_date, match_time, match_end_time, location, status, match_guests ( status )"
      )
      .eq("created_by", uid)
      .order("match_date", { ascending: false })
      .order("match_time", { ascending: false });

    if (queryError) throw queryError;

    const rows = (data as Array<Record<string, unknown>> | null) ?? [];
    setMatches(
      rows.map((row) => {
        const guests = Array.isArray(row.match_guests)
          ? (row.match_guests as Array<{ status: string }>)
          : [];
        return {
          id: row.id as string,
          title: (row.title as string | null) || t("match.untitled"),
          date: row.match_date as string,
          time: row.match_time as string,
          endTime: (row.match_end_time as string | null) ?? null,
          location: (row.location as string) ?? "",
          status: row.status === "closed" ? "closed" : "open",
          attendees: guests.filter((g) => g.status === "yes").length,
        };
      })
    );
  }, [t]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          router.replace("/");
          return;
        }

        await ensureUserProfile(data.session.user);
        const uid = data.session.user.id;
        setUserId(uid);

        const { data: profile } = await supabase
          .from("users")
          .select("name, avatar_url")
          .eq("id", uid)
          .maybeSingle();
        if (profile?.name) {
          setDisplayName(profile.name);
        }
        setAvatarUrl(profile?.avatar_url ?? null);

        await loadMatches(uid);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("dashboard.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [router, loadMatches, t]);

  // Surface guest RSVPs live so the counts stay fresh.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`dash-matches-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_guests" },
        () => void loadMatches(userId)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => void loadMatches(userId)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, loadMatches]);

  const { upcoming, history } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const up: HostMatch[] = [];
    const past: HostMatch[] = [];
    // Source list is newest-first; upcoming reads best oldest-first.
    const ascending = [...matches].sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
    );
    for (const match of ascending) {
      if (match.status === "open" && match.date >= today) up.push(match);
      else past.unshift(match); // newest past first
    }
    return { upcoming: up, history: past };
  }, [matches]);

  const handleCopyLink = async (matchId: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/m/${matchId}`
      );
      setCopiedId(matchId);
      window.setTimeout(
        () => setCopiedId((c) => (c === matchId ? null : c)),
        1600
      );
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const handleDelete = async (matchId: string) => {
    if (
      !(await confirm({
        message: t("matches.confirmDelete"),
        confirmLabel: t("matches.delete"),
        destructive: true,
      }))
    )
      return;
    setBusyId(matchId);
    try {
      const { error: deleteError } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);
      if (deleteError) throw new Error(deleteError.message);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("matches.errDelete"));
    } finally {
      setBusyId(null);
    }
  };

  const visible = tab === "upcoming" ? upcoming : history;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 pb-[calc(7rem+env(safe-area-inset-bottom))] text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-80px] h-80 w-80 rounded-full bg-lime-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -left-32 h-80 w-80 rounded-full bg-lime-500/5 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-8 pb-16">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-lime-400">
              {t("dashboard.eyebrow")}
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight text-lime-400">
              {t("dashboard.myMatches")}
            </h1>
          </div>
        </header>

        <section className="flex items-center gap-4">
          <UserAvatar name={displayName} url={avatarUrl} />
          <div className="min-w-0 space-y-1">
            <h2 className="text-[28px] font-semibold leading-tight">
              {t("dashboard.greeting")}{" "}
              <span className="text-lime-400">
                {displayName || t("dashboard.defaultName")}
              </span>
            </h2>
            <p className="text-sm text-slate-300">
              {t("dashboard.readyToday")}
            </p>
          </div>
        </section>

        {userId ? <CreateMatchPanel onCreated={() => void loadMatches(userId)} /> : null}

        <nav className="flex gap-2 rounded-full bg-slate-900/70 p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab("upcoming")}
            className={`flex-1 rounded-full py-2 transition ${
              tab === "upcoming"
                ? "bg-lime-500 text-slate-950"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            {t("dashboard.upcoming")}
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`flex-1 rounded-full py-2 transition ${
              tab === "history"
                ? "bg-lime-500 text-slate-950"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            {t("dashboard.history")}
          </button>
        </nav>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <section className="space-y-3">
          {loading ? (
            <div className="glass-panel h-32 animate-pulse rounded-2xl" />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              message={
                tab === "upcoming"
                  ? t("dashboard.emptyMatches")
                  : t("dashboard.emptyHistory")
              }
            />
          ) : (
            visible.map((match) => (
              <article
                key={match.id}
                className="glass-panel rounded-2xl p-4 transition hover:border-lime-500/40"
              >
                <Link
                  href={`/dashboard/matches/${match.id}`}
                  className="group block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-semibold leading-tight">
                        {formatMatchHeading(match.date)}
                      </h4>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
                        <CalendarClock
                          size={14}
                          strokeWidth={1.75}
                          className="shrink-0 text-lime-400"
                        />
                        <span className="truncate">
                          {match.time.slice(0, 5)}
                          {match.endTime
                            ? ` - ${match.endTime.slice(0, 5)}`
                            : ""}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin
                          size={12}
                          strokeWidth={1.75}
                          className="shrink-0"
                        />
                        <span className="line-clamp-1">{match.location}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <Users size={12} strokeWidth={1.75} className="shrink-0" />
                        <span>
                          {t("matches.attendees", {
                            count: match.attendees,
                          })}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                        match.status === "open"
                          ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                          : "border-white/10 bg-slate-800 text-slate-400"
                      }`}
                    >
                      {match.status === "open"
                        ? t("matches.statusOpen")
                        : t("matches.statusClosed")}
                    </span>
                  </div>
                </Link>

                <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
                  <button
                    type="button"
                    onClick={() => void handleCopyLink(match.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-lime-500/50 hover:text-lime-300 active:scale-95"
                  >
                    {copiedId === match.id ? (
                      <Check size={12} strokeWidth={2.25} className="text-lime-400" />
                    ) : (
                      <Share2 size={12} strokeWidth={2} />
                    )}
                    {copiedId === match.id
                      ? t("match.linkCopied")
                      : t("match.shareLink")}
                  </button>
                  <Link
                    href={`/dashboard/matches/${match.id}`}
                    className="ml-auto rounded-lg bg-lime-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95"
                  >
                    {t("ledger.viewMatch")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDelete(match.id)}
                    disabled={busyId === match.id}
                    aria-label={t("matches.delete")}
                    className="rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                  >
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}

function UserAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-lime-500/30">
        <Image
          src={url}
          alt=""
          fill
          unoptimized
          sizes="56px"
          style={{ objectFit: "cover" }}
        />
      </span>
    );
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-lime-500/30 bg-slate-800/80 text-xl font-semibold text-lime-300">
      {initial}
    </span>
  );
}
