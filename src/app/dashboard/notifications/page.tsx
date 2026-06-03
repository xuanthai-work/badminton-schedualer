"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

type NotificationRow = {
  id: string;
  type: string;
  groupId: string | null;
  matchId: string | null;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { t, lang, formatDate, formatVnd } = useI18n();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<NotificationRow[]>([]);

  const load = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("notifications")
      .select("id, type, group_id, match_id, data, read, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (queryError) throw new Error(queryError.message);

    const mapped: NotificationRow[] =
      data?.map((row) => ({
        id: row.id as string,
        type: row.type as string,
        groupId: (row.group_id as string | null) ?? null,
        matchId: (row.match_id as string | null) ?? null,
        data: (row.data as Record<string, unknown>) ?? {},
        read: Boolean(row.read),
        createdAt: row.created_at as string,
      })) ?? [];
    setItems(mapped);

    // Mark everything read once it's on screen; the header badge clears live.
    if (mapped.some((n) => !n.read)) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("read", false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          router.replace("/");
          return;
        }
        await load();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("notifications.loadError")
        );
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, load, t]);

  const renderText = (n: NotificationRow) => {
    if (n.type === "match_created") {
      const date = formatDate(String(n.data.match_date ?? ""));
      const time = String(n.data.match_time ?? "").slice(0, 5);
      return t("notifications.matchCreated", {
        group: String(n.data.group_name ?? ""),
        date,
        time,
      });
    }
    if (n.type === "added_to_group") {
      return t("notifications.addedToGroup", {
        actor: String(n.data.added_by ?? ""),
        group: String(n.data.group_name ?? ""),
      });
    }
    if (n.type === "group_invite") {
      return t("notifications.groupInvite", {
        inviter: String(n.data.inviter ?? ""),
        group: String(n.data.group_name ?? ""),
      });
    }
    if (n.type === "group_invite_accepted") {
      return t("notifications.groupInviteAccepted", {
        member: String(n.data.member ?? ""),
        group: String(n.data.group_name ?? ""),
      });
    }
    if (n.type === "friend_request") {
      return t("notifications.friendRequest", {
        name: String(n.data.name ?? ""),
      });
    }
    if (n.type === "friend_accepted") {
      return t("notifications.friendAccepted", {
        name: String(n.data.name ?? ""),
      });
    }
    if (n.type === "payment_confirmed") {
      return t("notifications.paymentConfirmed", {
        amount: formatVnd(Number(n.data.amount ?? 0)),
        group: String(n.data.group_name ?? ""),
      });
    }
    if (n.type === "attendance_request") {
      return t("notifications.attendanceRequest", {
        group: String(n.data.group_name ?? ""),
        date: formatDate(String(n.data.match_date ?? "")),
        time: String(n.data.match_time ?? "").slice(0, 5),
      });
    }
    if (n.type === "attendance_confirmed") {
      return t(
        n.data.attended
          ? "notifications.attendanceConfirmed"
          : "notifications.attendanceDeclined",
        {
          name: String(n.data.name ?? ""),
          group: String(n.data.group_name ?? ""),
        }
      );
    }
    return n.type;
  };

  const hrefFor = (n: NotificationRow) => {
    if (n.type === "match_created" && n.groupId && n.matchId) {
      return `/dashboard/groups/${n.groupId}/matches/${n.matchId}`;
    }
    // A pending invite goes to the dashboard (accept/decline card) — the
    // invitee isn't a group member yet, so the group page would reject them.
    if (n.type === "group_invite") return "/dashboard";
    if (n.type === "friend_request" || n.type === "friend_accepted") {
      return "/dashboard/friends";
    }
    if (n.type === "payment_confirmed" && n.groupId && n.matchId) {
      return `/dashboard/groups/${n.groupId}/matches/${n.matchId}`;
    }
    if (
      (n.type === "attendance_request" ||
        n.type === "attendance_confirmed") &&
      n.groupId &&
      n.matchId
    ) {
      return `/dashboard/groups/${n.groupId}/matches/${n.matchId}`;
    }
    if (n.groupId) return `/dashboard/groups/${n.groupId}`;
    return "/dashboard";
  };

  const timeLabel = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(lang === "vi" ? "vi-VN" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 pb-28 text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-80px] h-80 w-80 rounded-full bg-lime-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-lime-400 transition hover:text-lime-300"
          >
            <ChevronLeft size={14} strokeWidth={2} />
            {t("dashboard.eyebrow")}
          </Link>
          <h1 className="text-[28px] font-semibold leading-tight">
            {t("notifications.title")}
          </h1>
        </header>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        {loading ? (
          <div className="glass-panel h-40 animate-pulse rounded-2xl" />
        ) : items.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 text-sm text-slate-300">
            {t("notifications.empty")}
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => {
              const Icon =
                n.type === "match_created"
                  ? Calendar
                  : n.type === "payment_confirmed"
                    ? ReceiptText
                    : UserPlus;
              return (
                <li key={n.id}>
                  <Link
                    href={hrefFor(n)}
                    className={`glass-panel group flex items-center gap-3 rounded-2xl p-4 transition hover:border-lime-500/40 ${
                      n.read ? "" : "border-lime-500/30"
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-500/10 text-lime-400">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-100">{renderText(n)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {timeLabel(n.createdAt)}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      strokeWidth={2}
                      className="shrink-0 text-slate-500 transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
