"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";
import MembersPanel from "./MembersPanel";
import MatchesPanel from "./MatchesPanel";
import GroupSettingsPanel from "./GroupSettingsPanel";

type Tab = "matches" | "members" | "settings";
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
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 pb-28 text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-80px] h-80 w-80 rounded-full bg-lime-500/10 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-lime-400 transition hover:text-lime-300"
          >
            <ChevronLeft size={14} strokeWidth={2} />
            Dashboard
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-semibold leading-tight">
              {group?.name ?? "Đang tải nhóm..."}
            </h1>
            {role && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                  isAdmin
                    ? "border-lime-500/30 bg-lime-500/20 text-lime-300"
                    : "border-white/10 bg-slate-800/80 text-slate-300"
                }`}
              >
                {isAdmin ? "Admin" : "Member"}
              </span>
            )}
          </div>
        </header>

        <nav className="flex gap-2 rounded-full bg-slate-900/70 p-1 text-sm">
          <button
            type="button"
            className={`flex-1 rounded-full py-2 transition ${
              tab === "matches"
                ? "bg-lime-500 text-slate-950"
                : "text-slate-300 hover:text-slate-100"
            }`}
            onClick={() => setTab("matches")}
          >
            Lịch đánh
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full py-2 transition ${
              tab === "members"
                ? "bg-lime-500 text-slate-950"
                : "text-slate-300 hover:text-slate-100"
            }`}
            onClick={() => setTab("members")}
          >
            Thành viên
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`flex-1 rounded-full py-2 transition ${
                tab === "settings"
                  ? "bg-lime-500 text-slate-950"
                  : "text-slate-300 hover:text-slate-100"
              }`}
              onClick={() => setTab("settings")}
            >
              Cài đặt
            </button>
          )}
        </nav>

        {loading ? (
          <div className="glass-panel h-40 animate-pulse rounded-2xl" />
        ) : error ? (
          <p className="text-sm text-rose-400">{error}</p>
        ) : group && userId ? (
          tab === "matches" ? (
            <MatchesPanel groupId={group.id} isAdmin={isAdmin} />
          ) : tab === "members" ? (
            <MembersPanel
              groupId={group.id}
              isAdmin={isAdmin}
              currentUserId={userId}
              createdBy={group.createdBy}
            />
          ) : tab === "settings" && isAdmin ? (
            <GroupSettingsPanel
              groupId={group.id}
              groupName={group.name}
              onRenamed={(newName) =>
                setGroup((prev) => (prev ? { ...prev, name: newName } : prev))
              }
            />
          ) : null
        ) : null}
      </div>
      <BottomNav />
    </main>
  );
}
