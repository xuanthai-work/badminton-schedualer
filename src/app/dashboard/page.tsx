"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CalendarClock,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";
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

type UpcomingMatch = {
  id: string;
  groupId: string;
  groupName: string;
  date: string;
  time: string;
  location: string;
  yesCount: number;
  myStatus: "yes" | "no" | "maybe" | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { t, formatVnd, formatDate } = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingMatch[]>([]);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [debt, setDebt] = useState<{
    owe: number;
    oweMatches: number;
    collect: number;
    collectMatches: number;
    collectGroup: string | null;
  }>({ owe: 0, oweMatches: 0, collect: 0, collectMatches: 0, collectGroup: null });
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
    const { data } = await supabase.rpc("get_debt_overview");
    const row = (data as Array<Record<string, unknown>> | null)?.[0];
    setDebt({
      owe: Number(row?.owe_amount ?? 0),
      oweMatches: Number(row?.owe_matches ?? 0),
      collect: Number(row?.collect_amount ?? 0),
      collectMatches: Number(row?.collect_matches ?? 0),
      collectGroup: (row?.collect_group as string | null) ?? null,
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
      return [] as string[];
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

    return groupIds;
  }, [t]);

  const loadUpcoming = useCallback(
    async (uid: string, groupIds: string[]) => {
      if (groupIds.length === 0) {
        setUpcoming([]);
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("matches")
        .select(
          "id, match_date, match_time, location, group_id, groups ( name ), rsvps ( status, user_id )"
        )
        .in("group_id", groupIds)
        .eq("status", "open")
        .gte("match_date", today)
        .order("match_date", { ascending: true })
        .order("match_time", { ascending: true });

      const rows = (data as Array<Record<string, unknown>> | null) ?? [];
      const mapped: UpcomingMatch[] = rows.map((row) => {
        const group = Array.isArray(row.groups)
          ? (row.groups[0] as { name?: string } | undefined)
          : (row.groups as { name?: string } | undefined);
        const rsvps = Array.isArray(row.rsvps)
          ? (row.rsvps as Array<{ status: string; user_id: string }>)
          : [];
        const mine = rsvps.find((r) => r.user_id === uid);
        const yesCount = rsvps.filter((r) => r.status === "yes").length;
        return {
          id: row.id as string,
          groupId: row.group_id as string,
          groupName: group?.name ?? "",
          date: row.match_date as string,
          time: row.match_time as string,
          location: (row.location as string) ?? "",
          yesCount,
          myStatus:
            (mine?.status as UpcomingMatch["myStatus"]) ?? null,
        };
      });

      setUpcoming(mapped);
    },
    []
  );

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

        const uid = data.session.user.id;
        const [groupIds] = await Promise.all([
          loadGroups(uid),
          loadInvites(),
          loadDebt(),
        ]);
        await loadUpcoming(uid, groupIds ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("dashboard.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [router, loadGroups, loadInvites, loadDebt, loadUpcoming, t]);

  // Surface newly created matches live, so members never miss them.
  useEffect(() => {
    if (!userId || groups.length === 0) return;
    const groupIds = groups.map((g) => g.id);
    const topic = `dash-matches-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          void loadUpcoming(userId, groupIds);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, groups, loadUpcoming]);

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
      if (accept && userId) {
        const groupIds = await loadGroups(userId);
        await loadUpcoming(userId, groupIds ?? []);
      }
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

        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">
              {t("dashboard.upcomingTitle")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {upcoming.map((match) => {
                const needsRsvp = match.myStatus === null;
                return (
                  <Link
                    key={match.id}
                    href={`/dashboard/groups/${match.groupId}/matches/${match.id}`}
                    className={`glass-panel group flex flex-col gap-3 rounded-2xl p-4 transition hover:border-lime-500/40 ${
                      needsRsvp ? "border-lime-500/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-400">
                          {match.groupName}
                        </p>
                        <p className="mt-1 text-base font-semibold leading-tight">
                          {formatDate(match.date, {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </p>
                      </div>
                      {needsRsvp ? (
                        <span className="shrink-0 rounded-lg border border-lime-500/30 bg-lime-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-lime-300">
                          {t("dashboard.upcomingNeedsRsvp")}
                        </span>
                      ) : (
                        <span
                          className={`shrink-0 rounded-lg border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                            match.myStatus === "yes"
                              ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                              : "border-white/10 bg-slate-800 text-slate-400"
                          }`}
                        >
                          {match.myStatus === "yes"
                            ? t("dashboard.upcomingGoing")
                            : t("dashboard.upcomingNotGoing")}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <Clock
                          size={15}
                          strokeWidth={1.75}
                          className="text-slate-400"
                        />
                        <span>{match.time.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin
                          size={15}
                          strokeWidth={1.75}
                          className="text-slate-400"
                        />
                        <span className="line-clamp-1">{match.location}</span>
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <Users size={14} strokeWidth={1.75} />
                        {t("dashboard.upcomingAttendees", {
                          count: match.yesCount,
                        })}
                      </span>
                      <CalendarClock
                        size={15}
                        strokeWidth={1.75}
                        className="text-lime-400 transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {debt.owe + debt.collect > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t("dashboard.debtTitle")}</h3>
              <Link
                href="/dashboard/debts"
                aria-label={t("dashboard.debtTitle")}
                className="text-slate-500 transition hover:text-slate-300"
              >
                <Info size={18} strokeWidth={1.75} />
              </Link>
            </div>
            <div className="glass-panel space-y-5 rounded-2xl p-5">
              {debt.owe > 0 && (
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
                    <Wallet size={22} strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {t("dashboard.debtToPay")}
                    </p>
                    <p className="text-2xl font-bold leading-tight text-rose-400">
                      {formatVnd(debt.owe)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("dashboard.debtOweMatches", { count: debt.oweMatches })}
                    </p>
                  </div>
                </div>
              )}
              {debt.collect > 0 && (
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
                    <Banknote size={22} strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {t("dashboard.debtCollect")}
                    </p>
                    <p className="text-2xl font-bold leading-tight text-emerald-400">
                      {formatVnd(debt.collect)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {debt.collectGroup
                        ? t("dashboard.debtCollectFrom", {
                            group: debt.collectGroup,
                          })
                        : t("dashboard.debtCollectGroups", {
                            count: debt.collectMatches,
                          })}
                    </p>
                  </div>
                </div>
              )}
              <Link
                href="/dashboard/debts"
                className="flex items-center justify-center gap-2 rounded-xl bg-lime-500 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.3)] transition hover:scale-[1.01] active:scale-[0.98]"
              >
                {t("dashboard.debtCta")}
                <ChevronRight size={16} strokeWidth={2.25} />
              </Link>
            </div>
          </section>
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
