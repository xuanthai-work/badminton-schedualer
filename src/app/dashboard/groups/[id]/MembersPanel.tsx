"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Member = {
  userId: string;
  name: string;
  email: string;
  role: "admin" | "member";
  joinedAt: string;
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
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);

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
            name: user?.name ?? "(không rõ)",
            email: user?.email ?? "",
            role: row.role === "admin" ? "admin" : "member",
            joinedAt: row.joined_at,
          };
        }) ?? [];

      setMembers(mapped);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải thành viên.");
    }
  }, [groupId]);

  useEffect(() => {
    const run = async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [load]);

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setInviteBusy(true);
    setInviteMsg("");
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "invite_user_by_email",
        { target_group_id: groupId, target_email: email }
      );
      if (rpcError) {
        throw new Error(rpcError.message);
      }
      const result = data as
        | { status: "added" | "already_member" | "user_not_found" }
        | null;

      if (result?.status === "added") {
        setInviteMsg("Đã thêm thành viên.");
        setInviteEmail("");
        await load();
      } else if (result?.status === "already_member") {
        setInviteMsg("Người này đã có trong nhóm.");
      } else if (result?.status === "user_not_found") {
        setInviteMsg("Email chưa đăng ký tài khoản trên hệ thống.");
      } else {
        setInviteMsg("Không thể thêm thành viên.");
      }
    } catch (err) {
      setInviteMsg(err instanceof Error ? err.message : "Lỗi mời thành viên.");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleToggleRole = async (member: Member) => {
    if (member.userId === createdBy) {
      setError("Không thể đổi vai trò của người tạo nhóm.");
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
      setError(err instanceof Error ? err.message : "Lỗi đổi vai trò.");
    } finally {
      setActionBusy(null);
    }
  };

  const handleRemove = async (member: Member) => {
    if (member.userId === createdBy) {
      setError("Không thể xóa người tạo nhóm.");
      return;
    }
    if (!confirm(`Xóa ${member.name} khỏi nhóm?`)) return;

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
      setError(err instanceof Error ? err.message : "Lỗi xóa thành viên.");
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
            <label className="text-slate-300">Mời thêm thành viên (email)</label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              required
            />
          </div>
          <button
            className="rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            disabled={inviteBusy}
          >
            {inviteBusy ? "Đang mời..." : "Mời"}
          </button>
          {inviteMsg && (
            <p className="basis-full text-xs text-slate-300">{inviteMsg}</p>
          )}
        </form>
      )}

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {loading ? (
        <div className="glass-panel h-24 animate-pulse rounded-2xl" />
      ) : members.length === 0 ? (
        <div className="glass-panel rounded-2xl p-6 text-sm text-slate-300">
          Chưa có thành viên.
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
                      <span className="ml-2 text-xs text-slate-400">(bạn)</span>
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
                    {member.role === "admin" ? "Admin" : "Member"}
                    {isCreator && " · Tạo nhóm"}
                  </span>
                  {isAdmin && !isCreator && (
                    <>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-60"
                        disabled={actionBusy === member.userId}
                        onClick={() => handleToggleRole(member)}
                      >
                        {member.role === "admin" ? "Hạ quyền" : "Phong admin"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-rose-700/60 px-3 py-1 text-xs text-rose-300 hover:border-rose-500 disabled:opacity-60"
                        disabled={actionBusy === member.userId}
                        onClick={() => handleRemove(member)}
                      >
                        Xóa
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
