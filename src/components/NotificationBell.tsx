"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

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

  return (
    <Link
      href="/dashboard/notifications"
      aria-label="Notifications"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-200 transition hover:border-lime-500/40 hover:text-lime-300"
    >
      <Bell size={18} strokeWidth={1.75} />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-lime-500 px-1 text-[10px] font-bold text-slate-950">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
