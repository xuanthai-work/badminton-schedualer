"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Users, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { ensureUserProfile } from "@/lib/userProfile";
import { useI18n } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import CreateGroupPanel from "./CreateGroupPanel";

type GroupCard = {
  id: string;
  name: string;
  role: string;
  memberCount: number;
  adminName: string;
};

type GroupInvite = {
  inviteId: string;
  groupId: string;
  groupName: string;
  inviterName: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { t, formatVnd } = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [debt, setDebt] = useState<{ unpaid: number; submitted: number }>({
    unpaid: 0,
    submitted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInvites = useCallback(async () => {
    const { data } = await supabase.rpc("get_group_invites");
    const rows = (data as Array<Record<string, unknown>> | null) ?? [];
    const mapped: GroupInvite[] = rows.map((r) => ({
      inviteId: r.invite_id as string,
      groupId: r.group_id as string,
      groupName: (r.group_name as string) ?? "",
      inviterName: (r.inviter_name as string) ?? "",
    }));
    setInvites(mapped);
    return mapped;
  }, []);

  const loadDebt = useCallback(async () => {
    const { data } = await supabase.rpc("get_payment_summary");
    const row = (data as Array<Record<string, unknown>> | null)?.[0];
    setDebt({
      unpaid: Number(row?.owe_unpaid ?? 0),
      submitted: Number(row?.owe_submitted ?? 0),
    });
  }, []);

  const loadGroups = useCallback(async (uid: string) => {
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
          adminName: stats?.adminName ?? t("dashboard.unknownAdmin"),
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
        setUserId(data.session.user.id);

        const { data: profile } = await supabase
          .from("users")
          .select("name")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (profile?.name) {
          setDisplayName(profile.name);
        }

        await Promise.all([
          loadGroups(data.session.user.id),
          loadInvites(),
          loadDebt(),
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("dashboard.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [router, loadGroups, loadInvites, loadDebt, t]);

  const respondInvite = async (invite: GroupInvite, accept: boolean) => {
    setInviteBusy(invite.inviteId);
    setError("");
    try {
      const { error: rpcError } = await supabase.rpc("respond_group_invite", {
        invite_id: invite.inviteId,
        accept,
      });
      if (rpcError) throw new Error(rpcError.message);
      await loadInvites();
      if (accept && userId) await loadGroups(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.inviteError"));
    } finally {
      setInviteBusy(null);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-6 py-10 pb-28 text-slate-50">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 right-[-80px] h-80 w-80 rounded-full bg-lime-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -left-32 h-80 w-80 rounded-full bg-lime-500/5 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 pb-16">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-lime-400">
              {t("dashboard.eyebrow")}
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight text-lime-400">
              {t("dashboard.myGroups")}
            </h1>
          </div>
          <NotificationBell />
        </header>

        <section className="space-y-1">
          <h2 className="text-[28px] font-semibold leading-tight">
            {t("dashboard.greeting")}{" "}
            <span className="text-lime-400">
              {displayName || t("dashboard.defaultName")}
            </span>
          </h2>
          <p className="text-sm text-slate-300">
            {t("dashboard.readyToday")}
          </p>
        </section>

        {debt.unpaid + debt.submitted > 0 && (
          <div className="glass-panel flex items-center justify-between gap-4 rounded-2xl border-amber-500/20 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                {t("dashboard.debtTitle")}
              </p>
              <p className="mt-1 text-2xl font-semibold leading-tight">
                {formatVnd(debt.unpaid + debt.submitted)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {t("dashboard.debtToPay")} {formatVnd(debt.unpaid)} ·{" "}
                {t("dashboard.debtPending")} {formatVnd(debt.submitted)}
              </p>
            </div>
            <Wallet size={28} strokeWidth={1.5} className="text-amber-300" />
          </div>
        )}

        {invites.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">
              {t("dashboard.invitesTitle")}
            </h3>
            {invites.map((invite) => (
              <div
                key={invite.inviteId}
                className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl border-lime-500/20 p-4"
              >
                <p className="min-w-0 text-sm text-slate-200">
                  {t("dashboard.inviteFrom", {
                    inviter: invite.inviterName,
                    group: invite.groupName,
                  })}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={inviteBusy === invite.inviteId}
                    onClick={() => respondInvite(invite, true)}
                    className="rounded-lg bg-lime-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                  >
                    {t("dashboard.inviteAccept")}
                  </button>
                  <button
                    type="button"
                    disabled={inviteBusy === invite.inviteId}
                    onClick={() => respondInvite(invite, false)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500 active:scale-95 disabled:opacity-60"
                  >
                    {t("dashboard.inviteDecline")}
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold">{t("dashboard.groupList")}</h3>
            {userId && (
              <span className="text-xs text-slate-400">
                {t("dashboard.groupCount", { count: groups.length })}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="glass-panel h-40 animate-pulse rounded-2xl"
                />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-rose-400">{error}</p>
          ) : groups.length === 0 ? (
            <div className="glass-panel rounded-2xl p-6 text-sm text-slate-300">
              {t("dashboard.emptyGroups")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map((group) => (
                <GroupCardItem key={group.id} group={group} />
              ))}
            </div>
          )}
        </section>
      </div>

      {userId ? <CreateGroupPanel onCreated={() => loadGroups(userId)} /> : null}
      <BottomNav />
    </main>
  );
}

function GroupCardItem({ group }: { group: GroupCard }) {
  const { t } = useI18n();
  const isAdmin = group.role === "admin";
  return (
    <Link
      href={`/dashboard/groups/${group.id}`}
      className="glass-panel group relative block overflow-hidden rounded-2xl p-5 transition hover:border-lime-500/40"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-lime-500/5 blur-3xl transition-colors group-hover:bg-lime-500/10"
      />

      <div className="relative flex items-start justify-between">
        <div className="rounded-lg bg-lime-500/10 p-3 text-lime-400">
          <Users size={20} strokeWidth={1.75} />
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
            isAdmin
              ? "border-lime-500/30 bg-lime-500/20 text-lime-300"
              : "border-white/10 bg-slate-800/80 text-slate-300"
          }`}
        >
          {isAdmin ? t("common.admin") : t("common.member")}
        </span>
      </div>

      <h4 className="relative mt-4 text-xl font-semibold leading-tight">
        {group.name}
      </h4>
      <div className="relative mt-1 flex items-center gap-2 text-sm text-slate-400">
        <Users size={14} strokeWidth={1.75} />
        <span>{t("dashboard.memberCount", { count: group.memberCount })}</span>
      </div>

      <div className="relative mt-5 flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex items-center gap-3">
          <InitialAvatar name={group.adminName} size={32} />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              {t("common.admin")}
            </p>
            <p className="text-sm text-slate-100">{group.adminName}</p>
          </div>
        </div>
        <ChevronRight
          size={18}
          strokeWidth={1.75}
          className="text-lime-400 transition-transform group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

function InitialAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex items-center justify-center rounded-full border border-white/10 bg-slate-800/80 font-semibold text-lime-300"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {initial}
    </div>
  );
}
