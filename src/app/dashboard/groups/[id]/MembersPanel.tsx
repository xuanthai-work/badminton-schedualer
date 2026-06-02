"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

type Member = {
  userId: string;
  name: string;
  email: string;
  role: "admin" | "member";
  joinedAt: string;
};

type FriendLite = {
  userId: string;
  name: string;
  username: string;
  tag: string | null;
};

type Props = {
  groupId: string;
  isAdmin: boolean;
  currentUserId: string;
  createdBy: string;
};

export default function MembersPanel({
  groupId,
  isAdmin,
  currentUserId,
  createdBy,
}: Props) {
  const { t } = useI18n();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteValue, setInviteValue] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendLite[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const { data, error: queryError } = await supabase
        .from("group_members")
        .select("user_id, role, joined_at, users ( name, email )")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true });

      if (queryError) {
        throw queryError;
      }

      const mapped: Member[] =
        data?.map((row) => {
          const user = Array.isArray(row.users) ? row.users[0] : row.users;
          return {
            userId: row.user_id,
            name: user?.name ?? t("members.unknownUser"),
            email: user?.email ?? "",
            role: row.role === "admin" ? "admin" : "member",
            joinedAt: row.joined_at,
          };
        }) ?? [];

      setMembers(mapped);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("members.errLoad"));
    }
  }, [groupId, t]);

  const loadFriends = useCallback(async () => {
    if (!isAdmin) return;
    const [{ data: friendData }, { data: pendingData }] = await Promise.all([
      supabase.rpc("get_friends"),
      supabase.rpc("get_group_pending_invites", { target_group_id: groupId }),
    ]);
    const rows = (friendData as Array<Record<string, unknown>> | null) ?? [];
    setFriends(
      rows
        .filter((r) => r.relation === "friend")
        .map((r) => ({
          userId: r.user_id as string,
          name: (r.name as string) ?? "",
          username: (r.username as string) ?? "",
          tag: (r.tag as string | null) ?? null,
        }))
    );
    // Seed the "Đã mời" state from invites already pending for this group.
    const pending = (pendingData as Array<{ invitee: string }> | null) ?? [];
    setInvitedIds(new Set(pending.map((p) => p.invitee)));
  }, [isAdmin, groupId]);

  useEffect(() => {
    const run = async () => {
      try {
        await Promise.all([load(), loadFriends()]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [load, loadFriends]);

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const identifier = inviteValue.trim();
    if (!identifier) return;

    setInviteBusy(true);
    setInviteMsg("");
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "invite_user_by_identifier",
        { target_group_id: groupId, target_identifier: identifier }
      );
      if (rpcError) {
        throw new Error(rpcError.message);
      }
      const result = data as
        | {
            status:
              | "invited"
              | "already_invited"
              | "already_member"
              | "not_friend"
              | "user_not_found";
          }
        | null;

      if (result?.status === "invited") {
        setInviteMsg(t("members.invited"));
        setInviteValue("");
      } else if (result?.status === "already_invited") {
        setInviteMsg(t("members.alreadyInvited"));
      } else if (result?.status === "already_member") {
        setInviteMsg(t("members.alreadyMember"));
      } else if (result?.status === "not_friend") {
        setInviteMsg(t("members.notFriend"));
      } else if (result?.status === "user_not_found") {
        setInviteMsg(t("members.notRegistered"));
      } else {
        setInviteMsg(t("members.cannotAdd"));
      }
    } catch (err) {
      setInviteMsg(err instanceof Error ? err.message : t("members.errInvite"));
    } finally {
      setInviteBusy(false);
    }
  };

  const inviteFriend = async (friend: FriendLite) => {
    setActionBusy(friend.userId);
    setInviteMsg("");
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "invite_user_by_identifier",
        { target_group_id: groupId, target_identifier: friend.username }
      );
      if (rpcError) throw new Error(rpcError.message);
      const result = data as { status?: string } | null;
      if (result?.status === "invited" || result?.status === "already_invited") {
        setInviteMsg(
          result.status === "invited"
            ? t("members.invited")
            : t("members.alreadyInvited")
        );
        setInvitedIds((prev) => new Set(prev).add(friend.userId));
      } else if (result?.status === "already_member") {
        setInviteMsg(t("members.alreadyMember"));
      } else if (result?.status === "not_friend") {
        setInviteMsg(t("members.notFriend"));
      } else {
        setInviteMsg(t("members.cannotAdd"));
      }
    } catch (err) {
      setInviteMsg(err instanceof Error ? err.message : t("members.errInvite"));
    } finally {
      setActionBusy(null);
    }
  };

  const invitableFriends = friends.filter(
    (f) => !members.some((m) => m.userId === f.userId)
  );

  const handleToggleRole = async (member: Member) => {
    if (member.userId === createdBy) {
      setError(t("members.errCreatorRole"));
      return;
    }
    setActionBusy(member.userId);
    setError("");
    try {
      const nextRole = member.role === "admin" ? "member" : "admin";
      const { error: updateError } = await supabase
        .from("group_members")
        .update({ role: nextRole })
        .eq("group_id", groupId)
        .eq("user_id", member.userId);

      if (updateError) {
        throw new Error(updateError.message);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("members.errRole"));
    } finally {
      setActionBusy(null);
    }
  };

  const handleRemove = async (member: Member) => {
    if (member.userId === createdBy) {
      setError(t("members.errRemoveCreator"));
      return;
    }
    if (!confirm(t("members.confirmRemove", { name: member.name }))) return;

    setActionBusy(member.userId);
    setError("");
    try {
      const { error: deleteError } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", member.userId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("members.errRemove"));
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <section className="space-y-4">
      {isAdmin && (
        <form
          onSubmit={handleInvite}
          className="glass-panel flex flex-wrap items-end gap-3 rounded-2xl p-4"
        >
          <div className="min-w-[220px] flex-1 space-y-1 text-sm">
            <label className="text-slate-300">{t("members.inviteLabel")}</label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
              placeholder={t("members.invitePlaceholder")}
              value={inviteValue}
              onChange={(event) => setInviteValue(event.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <button
            className="rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            disabled={inviteBusy}
          >
            {inviteBusy ? t("members.inviting") : t("members.invite")}
          </button>
          {inviteMsg && (
            <p className="basis-full text-xs text-slate-300">{inviteMsg}</p>
          )}
        </form>
      )}

      {isAdmin && friends.length > 0 && (
        <div className="glass-panel space-y-3 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <UserPlus size={16} strokeWidth={1.75} className="text-lime-400" />
            <h3 className="text-sm font-semibold">{t("members.inviteFriends")}</h3>
          </div>
          {invitableFriends.length === 0 ? (
            <p className="text-xs text-slate-400">
              {t("members.inviteFriendsEmpty")}
            </p>
          ) : (
            <ul className="space-y-2">
              {invitableFriends.map((friend) => (
                <li
                  key={friend.userId}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-900/50 px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-slate-100">
                    {friend.name}{" "}
                    <span className="text-xs text-slate-400">
                      @{friend.username}
                      {friend.tag && (
                        <span className="text-lime-400">#{friend.tag}</span>
                      )}
                    </span>
                  </span>
                  {invitedIds.has(friend.userId) ? (
                    <span className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400">
                      {t("members.invitedShort")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={actionBusy === friend.userId}
                      onClick={() => inviteFriend(friend)}
                      className="shrink-0 rounded-lg bg-lime-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                    >
                      {t("members.invite")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {loading ? (
        <div className="glass-panel h-24 animate-pulse rounded-2xl" />
      ) : members.length === 0 ? (
        <div className="glass-panel rounded-2xl p-6 text-sm text-slate-300">
          {t("members.empty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {members.map((member) => {
            const isCreator = member.userId === createdBy;
            const isSelf = member.userId === currentUserId;
            return (
              <li
                key={member.userId}
                className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div>
                  <p className="font-medium">
                    {member.name}
                    {isSelf && (
                      <span className="ml-2 text-xs text-slate-400">
                        {t("members.you")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      member.role === "admin"
                        ? "bg-lime-500/20 text-lime-300"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {member.role === "admin"
                      ? t("common.admin")
                      : t("common.member")}
                    {isCreator && ` · ${t("members.creatorTag")}`}
                  </span>
                  {isAdmin && !isCreator && (
                    <>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-60"
                        disabled={actionBusy === member.userId}
                        onClick={() => handleToggleRole(member)}
                      >
                        {member.role === "admin"
                          ? t("members.demote")
                          : t("members.promote")}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-rose-700/60 px-3 py-1 text-xs text-rose-300 hover:border-rose-500 disabled:opacity-60"
                        disabled={actionBusy === member.userId}
                        onClick={() => handleRemove(member)}
                      >
                        {t("members.remove")}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
