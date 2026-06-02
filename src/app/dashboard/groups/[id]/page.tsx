"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import MembersPanel from "./MembersPanel";
import MatchesPanel from "./MatchesPanel";

type Tab = "matches" | "members";
type GroupInfo = {
  id: string;
  name: string;
  createdBy: string;
};

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const groupId = params?.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [role, setRole] = useState<"admin" | "member" | null>(null);
  const [tab, setTab] = useState<Tab>("matches");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (uid: string) => {
      setError("");
      if (!groupId) return;

      const { data: groupRow, error: groupError } = await supabase
        .from("groups")
        .select("id, name, created_by")
        .eq("id", groupId)
        .maybeSingle();

      if (groupError) {
        throw groupError;
      }
      if (!groupRow) {
        throw new Error("Không tìm thấy nhóm hoặc bạn không có quyền xem.");
      }

      const { data: membership, error: memberError } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", uid)
        .maybeSingle();

      if (memberError) {
        throw memberError;
      }
      if (!membership) {
        throw new Error("Bạn không phải thành viên của nhóm này.");
      }

      setGroup({
        id: groupRow.id,
        name: groupRow.name,
        createdBy: groupRow.created_by,
      });
      setRole(membership.role === "admin" ? "admin" : "member");
    },
    [groupId]
  );

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) {
          router.replace("/");
          return;
        }
        setUserId(data.session.user.id);
        await load(data.session.user.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [router, load]);

  const isAdmin = role === "admin";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-xs uppercase tracking-[0.3em] text-lime-400 hover:text-lime-300"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-semibold">
              {group?.name ?? "Đang tải nhóm..."}
            </h1>
          </div>
          {role && (
            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs text-lime-300">
              {isAdmin ? "Admin" : "Member"}
            </span>
          )}
        </header>

        <nav className="flex gap-2 rounded-full bg-slate-900/70 p-1 text-sm">
          <button
            type="button"
            className={`flex-1 rounded-full py-2 transition ${
              tab === "matches" ? "bg-lime-500 text-slate-950" : "text-slate-300"
            }`}
            onClick={() => setTab("matches")}
          >
            Lịch đánh
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full py-2 transition ${
              tab === "members" ? "bg-lime-500 text-slate-950" : "text-slate-300"
            }`}
            onClick={() => setTab("members")}
          >
            Thành viên
          </button>
        </nav>

        {loading ? (
          <div className="glass-panel h-40 animate-pulse rounded-2xl" />
        ) : error ? (
          <p className="text-sm text-rose-400">{error}</p>
        ) : group && userId ? (
          tab === "matches" ? (
            <MatchesPanel groupId={group.id} isAdmin={isAdmin} />
          ) : (
            <MembersPanel
              groupId={group.id}
              isAdmin={isAdmin}
              currentUserId={userId}
              createdBy={group.createdBy}
            />
          )
        ) : null}
      </div>
    </main>
  );
}
