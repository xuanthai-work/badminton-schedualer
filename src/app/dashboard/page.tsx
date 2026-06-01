"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ensureUserProfile } from "@/lib/userProfile";
import CreateGroupPanel from "./CreateGroupPanel";

type GroupCard = {
  id: string;
  name: string;
  role: string;
  memberCount: number;
  adminName: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGroups = async (uid: string) => {
    setError("");
    const { data: memberships, error: membershipError } = await supabase
      .from("group_members")
      .select("group_id, role, groups ( id, name, created_by )")
      .eq("user_id", uid);

    if (membershipError) {
      throw membershipError;
    }

    const mappedGroups =
      memberships?.flatMap((row) => {
        const group = Array.isArray(row.groups) ? row.groups[0] : row.groups;
        if (!group) return [];
        return [
          {
            id: group.id,
            name: group.name,
            createdBy: group.created_by,
            role: row.role,
          },
        ];
      }) ?? [];

    const groupIds = mappedGroups.map((group) => group.id);

    if (groupIds.length === 0) {
      setGroups([]);
      return;
    }

    const { data: members, error: membersError } = await supabase
      .from("group_members")
      .select("group_id, role, users ( name )")
      .in("group_id", groupIds);

    if (membersError) {
      throw membersError;
    }

    const memberMap = new Map<string, { count: number; adminName?: string }>();

    members?.forEach((member) => {
      const entry = memberMap.get(member.group_id) ?? { count: 0 };
      entry.count += 1;

      const user = Array.isArray(member.users) ? member.users[0] : member.users;
      if (member.role === "admin" && user?.name) {
        entry.adminName = user.name;
      }

      memberMap.set(member.group_id, entry);
    });

    setGroups(
      mappedGroups.map((group) => {
        const stats = memberMap.get(group.id);
        return {
          id: group.id,
          name: group.name,
          role: group.role,
          memberCount: stats?.count ?? 0,
          adminName: stats?.adminName ?? "Chưa rõ",
        };
      })
    );
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          router.replace("/");
          return;
        }

        await ensureUserProfile(data.session.user);
        setUserId(data.session.user.id);
        await loadGroups(data.session.user.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-lime-400">
              Dashboard
            </p>
            <h1 className="text-2xl font-semibold">Nhóm của tôi</h1>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-800 px-4 py-2 text-sm text-slate-200 hover:border-slate-600"
            onClick={handleSignOut}
          >
            Đăng xuất
          </button>
        </header>

        <section className="glass-panel rounded-2xl p-4 text-sm text-slate-300">
          Tổng quan công nợ và lịch đấu sẽ được cập nhật trong Phase 2.
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Danh sách nhóm</h2>
            {userId && (
              <span className="text-xs text-slate-400">
                {groups.length} nhóm
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="glass-panel h-24 animate-pulse rounded-2xl"
                />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-rose-400">{error}</p>
          ) : groups.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-sm text-slate-300">
              Bạn chưa tham gia nhóm nào. Hãy tạo nhóm mới để bắt đầu.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map((group) => (
                <div key={group.id} className="glass-panel rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{group.name}</h3>
                    <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs text-lime-300">
                      {group.role === "admin" ? "Admin" : "Member"}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-slate-300">
                    <p>{group.memberCount} thành viên</p>
                    <p className="text-slate-400">Admin: {group.adminName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {userId ? <CreateGroupPanel onCreated={() => loadGroups(userId)} /> : null}
    </main>
  );
}
