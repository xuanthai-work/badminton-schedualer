"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Clock, UserPlus, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";

type Relation = "friend" | "incoming" | "outgoing";

type Friend = {
  friendshipId: string;
  userId: string;
  name: string;
  username: string;
  tag: string | null;
  avatarUrl: string | null;
  relation: Relation;
};

export default function FriendsPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);

  const [addValue, setAddValue] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState<{ text: string; ok: boolean } | null>(
    null
  );
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc("get_friends");
    if (rpcError) throw new Error(rpcError.message);
    const mapped: Friend[] =
      (data as Array<Record<string, unknown>> | null)?.map((row) => ({
        friendshipId: row.friendship_id as string,
        userId: row.user_id as string,
        name: (row.name as string) ?? "",
        username: (row.username as string) ?? "",
        tag: (row.tag as string | null) ?? null,
        avatarUrl: (row.avatar_url as string | null) ?? null,
        relation: row.relation as Relation,
      })) ?? [];
    setFriends(mapped);
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
        setError(err instanceof Error ? err.message : t("friends.loadError"));
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [router, load, t]);

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const identifier = addValue.trim();
    if (!identifier) return;

    setAddBusy(true);
    setAddMsg(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "send_friend_request",
        { target_identifier: identifier }
      );
      if (rpcError) throw new Error(rpcError.message);
      const status = (data as { status?: string } | null)?.status;

      const map: Record<string, { key: string; ok: boolean }> = {
        sent: { key: "friends.sent", ok: true },
        accepted: { key: "friends.accepted", ok: true },
        already_friends: { key: "friends.alreadyFriends", ok: false },
        already_sent: { key: "friends.alreadySent", ok: false },
        user_not_found: { key: "friends.userNotFound", ok: false },
        self: { key: "friends.self", ok: false },
      };
      const result = status ? map[status] : undefined;
      setAddMsg(
        result
          ? { text: t(result.key), ok: result.ok }
          : { text: t("friends.errSend"), ok: false }
      );

      if (result?.ok) {
        setAddValue("");
        await load();
      }
    } catch (err) {
      setAddMsg({
        text: err instanceof Error ? err.message : t("friends.errSend"),
        ok: false,
      });
    } finally {
      setAddBusy(false);
    }
  };

  const respond = async (friendshipId: string, accept: boolean) => {
    setActionBusy(friendshipId);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("respond_friend_request", {
        request_id: friendshipId,
        accept,
      });
      if (rpcError) throw new Error(rpcError.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("friends.errAction"));
    } finally {
      setActionBusy(null);
    }
  };

  const remove = async (friend: Friend) => {
    if (
      friend.relation === "friend" &&
      !confirm(t("friends.confirmRemove", { name: friend.name }))
    ) {
      return;
    }
    setActionBusy(friend.friendshipId);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("remove_friend", {
        friendship_id: friend.friendshipId,
      });
      if (rpcError) throw new Error(rpcError.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("friends.errAction"));
    } finally {
      setActionBusy(null);
    }
  };

  const incoming = friends.filter((f) => f.relation === "incoming");
  const outgoing = friends.filter((f) => f.relation === "outgoing");
  const accepted = friends.filter((f) => f.relation === "friend");

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
          <div>
            <h1 className="text-[28px] font-semibold leading-tight">
              {t("friends.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              {t("friends.subtitle")}
            </p>
          </div>
        </header>

        <form
          onSubmit={handleAdd}
          className="glass-panel space-y-3 rounded-2xl p-5"
        >
          <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t("friends.addLabel")}
          </label>
          <div className="flex gap-2">
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
              value={addValue}
              onChange={(event) => setAddValue(event.target.value)}
              placeholder={t("friends.addPlaceholder")}
              autoComplete="off"
              required
            />
            <button
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-lime-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.25)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
              disabled={addBusy}
            >
              <UserPlus size={16} strokeWidth={2} />
              {addBusy ? t("friends.sending") : t("friends.add")}
            </button>
          </div>
          {addMsg && (
            <p
              className={`ml-1 text-xs ${
                addMsg.ok ? "text-lime-300" : "text-rose-400"
              }`}
            >
              {addMsg.text}
            </p>
          )}
        </form>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        {loading ? (
          <div className="glass-panel h-40 animate-pulse rounded-2xl" />
        ) : (
          <>
            {incoming.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-300">
                  {t("friends.incomingTitle")} ({incoming.length})
                </h2>
                {incoming.map((f) => (
                  <FriendRow key={f.friendshipId} friend={f}>
                    <button
                      type="button"
                      disabled={actionBusy === f.friendshipId}
                      onClick={() => respond(f.friendshipId, true)}
                      className="inline-flex items-center gap-1 rounded-lg bg-lime-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                    >
                      <Check size={14} strokeWidth={2.25} />
                      {t("friends.accept")}
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy === f.friendshipId}
                      onClick={() => respond(f.friendshipId, false)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500 active:scale-95 disabled:opacity-60"
                    >
                      <X size={14} strokeWidth={2} />
                      {t("friends.decline")}
                    </button>
                  </FriendRow>
                ))}
              </section>
            )}

            {outgoing.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {t("friends.outgoingTitle")} ({outgoing.length})
                </h2>
                {outgoing.map((f) => (
                  <FriendRow key={f.friendshipId} friend={f}>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={14} strokeWidth={1.75} />
                    </span>
                    <button
                      type="button"
                      disabled={actionBusy === f.friendshipId}
                      onClick={() => remove(f)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500 active:scale-95 disabled:opacity-60"
                    >
                      {t("friends.cancelRequest")}
                    </button>
                  </FriendRow>
                ))}
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("friends.friendsTitle", { count: accepted.length })}
              </h2>
              {accepted.length === 0 ? (
                <div className="glass-panel rounded-2xl p-6 text-sm text-slate-300">
                  {t("friends.empty")}
                </div>
              ) : (
                accepted.map((f) => (
                  <FriendRow key={f.friendshipId} friend={f}>
                    <button
                      type="button"
                      disabled={actionBusy === f.friendshipId}
                      onClick={() => remove(f)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-700/60 px-3 py-1.5 text-xs text-rose-300 transition hover:border-rose-500 active:scale-95 disabled:opacity-60"
                    >
                      {t("friends.removeFriend")}
                    </button>
                  </FriendRow>
                ))
              )}
            </section>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function FriendRow({
  friend,
  children,
}: {
  friend: Friend;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel flex items-center justify-between gap-3 rounded-2xl p-4">
      <div className="flex min-w-0 items-center gap-3">
        <FriendAvatar name={friend.name} url={friend.avatarUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-100">
            {friend.name}
          </p>
          <p className="truncate text-xs text-slate-400">
            @{friend.username}
            {friend.tag && <span className="text-lime-400">#{friend.tag}</span>}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function FriendAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <span className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10">
        <Image src={url} alt="" fill unoptimized sizes="36px" style={{ objectFit: "cover" }} />
      </span>
    );
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-800/80 text-sm font-semibold text-lime-300">
      {initial}
    </span>
  );
}
