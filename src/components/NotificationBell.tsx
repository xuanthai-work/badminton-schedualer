"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Calendar, ChevronRight, ReceiptText, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

type NotificationRow = {
  id: string;
  type: string;
  groupId: string | null;
  matchId: string | null;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

export default function NotificationBell() {
  const router = useRouter();
  const { t, lang, formatDate, formatVnd } = useI18n();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // RLS already scopes notifications to the owner, so no user filter is
    // needed and we get the unread count without resolving the uid first.
    const refresh = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      setUnread(count ?? 0);
    };

    void refresh();

    // Unique topic per mount so a StrictMode re-mount never reuses an
    // already-subscribed channel (which would reject .on()).
    const channel = supabase
      .channel(`notifications-badge-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, group_id, match_id, data, read, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

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

      // Mark everything read once it's on screen; the badge clears live.
      if (mapped.some((n) => !n.read)) {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("read", false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) void load();
      return next;
    });
  };

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
    if (n.type === "match_reminder") {
      return t("notifications.matchReminder", {
        group: String(n.data.group_name ?? ""),
        time: String(n.data.match_time ?? "").slice(0, 5),
        location: String(n.data.location ?? ""),
      });
    }
    if (n.type === "match_rsvp_nudge") {
      return t("notifications.matchRsvpNudge", {
        group: String(n.data.group_name ?? ""),
        time: String(n.data.match_time ?? "").slice(0, 5),
        location: String(n.data.location ?? ""),
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
    if (n.type === "payment_submitted") {
      return t("notifications.paymentSubmitted", {
        name: String(n.data.name ?? ""),
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
    if (
      (n.type === "match_created" ||
        n.type === "match_reminder" ||
        n.type === "match_rsvp_nudge") &&
      n.groupId &&
      n.matchId
    ) {
      return `/dashboard/groups/${n.groupId}/matches/${n.matchId}`;
    }
    // A pending invite goes to the dashboard (accept/decline card) — the
    // invitee isn't a group member yet, so the group page would reject them.
    if (n.type === "group_invite") return "/dashboard";
    if (n.type === "friend_request" || n.type === "friend_accepted") {
      return "/dashboard/friends";
    }
    if (
      (n.type === "payment_confirmed" || n.type === "payment_submitted") &&
      n.groupId &&
      n.matchId
    ) {
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

  const go = async (n: NotificationRow) => {
    setOpen(false);
    const href = hrefFor(n);
    // Old notifications can point at a match the admin has since deleted —
    // verify it still exists and fall back to a dashboard toast if not.
    if (n.matchId && href.includes("/matches/")) {
      const { data } = await supabase
        .from("matches")
        .select("id")
        .eq("id", n.matchId)
        .maybeSingle();
      if (!data) {
        router.push("/dashboard?notice=match-gone");
        return;
      }
    }
    router.push(href);
  };

  const iconFor = (type: string) => {
    if (
      type === "match_created" ||
      type === "match_reminder" ||
      type === "match_rsvp_nudge"
    ) {
      return Calendar;
    }
    if (type === "payment_confirmed" || type === "payment_submitted") {
      return ReceiptText;
    }
    return UserPlus;
  };

  return (
    // z-30 lifts the bell's subtree above sibling glass-panel sections
    // (backdrop-filter stacking contexts) so the popover paints on top.
    <span className={`relative inline-block ${open ? "z-30" : ""}`}>
      <button
        type="button"
        aria-label="Notifications"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-200 transition hover:border-lime-500/40 hover:text-lime-300"
        onClick={toggle}
      >
        <Bell size={18} strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-lime-500 px-1 text-[10px] font-bold text-slate-950">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Invisible backdrop: tap anywhere outside to close. */}
          <button
            type="button"
            aria-label={t("common.close")}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="solid-panel absolute right-0 top-full z-20 mt-2 w-80 max-w-[calc(100vw-3rem)] rounded-xl shadow-2xl">
            <p className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-lime-400">
              {t("notifications.title")}
            </p>
            <div className="max-h-[55vh] overflow-y-auto overscroll-contain p-2">
              {loading ? (
                <div className="h-24 animate-pulse rounded-lg bg-slate-800/40" />
              ) : items.length === 0 ? (
                <p className="px-2 py-4 text-sm text-slate-400">
                  {t("notifications.empty")}
                </p>
              ) : (
                <ul className="space-y-1">
                  {items.map((n) => {
                    const Icon = iconFor(n.type);
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => go(n)}
                          className={`group flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition hover:bg-slate-800/60 ${
                            n.read ? "" : "bg-lime-500/5"
                          }`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-500/10 text-lime-400">
                            <Icon size={16} strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs text-slate-100">
                              {renderText(n)}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-slate-500">
                              {timeLabel(n.createdAt)}
                            </span>
                          </span>
                          <ChevronRight
                            size={14}
                            strokeWidth={2}
                            className="shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5"
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </span>
  );
}
