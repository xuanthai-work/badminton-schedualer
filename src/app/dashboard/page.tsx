"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Hash,
  Info,
  MapPin,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { ensureUserProfile } from "@/lib/userProfile";
import { useI18n } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import OnboardingPrompts from "@/components/OnboardingPrompts";
import CreateGroupPanel from "./CreateGroupPanel";
import CreateMatchPanel from "./CreateMatchPanel";

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

type GroupMatch = {
  id: string;
  groupId: string;
  groupName: string;
  date: string;
  time: string;
  endTime: string | null;
  location: string;
  status: "open" | "closed";
  yesCount: number;
  myStatus: "yes" | "no" | "maybe" | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { t, formatVnd } = useI18n();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [tagMissing, setTagMissing] = useState(false);
  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [rsvpBusyId, setRsvpBusyId] = useState<string | null>(null);
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

  const loadMatches = useCallback(
    async (uid: string, groupIds: string[]) => {
      if (groupIds.length === 0) {
        setMatches([]);
        return;
      }

      const { data } = await supabase
        .from("matches")
        .select(
          "id, match_date, match_time, match_end_time, location, group_id, status, groups ( name ), rsvps ( status, user_id )"
        )
        .in("group_id", groupIds)
        .order("match_date", { ascending: false })
        .order("match_time", { ascending: false });

      const rows = (data as Array<Record<string, unknown>> | null) ?? [];
      const mapped: GroupMatch[] = rows.map((row) => {
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
          endTime: (row.match_end_time as string | null) ?? null,
          location: (row.location as string) ?? "",
          status: row.status === "closed" ? "closed" : "open",
          yesCount,
          myStatus: (mine?.status as GroupMatch["myStatus"]) ?? null,
        };
      });

      setMatches(mapped);
    },
    []
  );

  const handleDeleteMatch = useCallback(
    async (id: string) => {
      if (!confirm(t("matches.confirmDelete"))) return;
      setDeletingMatchId(id);
      try {
        const { error: deleteError } = await supabase
          .from("matches")
          .delete()
          .eq("id", id);
        if (deleteError) throw new Error(deleteError.message);
        setMatches((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : t("matches.errDelete"));
      } finally {
        setDeletingMatchId(null);
      }
    },
    [t]
  );

  const handleQuickRsvp = useCallback(
    async (matchId: string, status: "yes" | "no") => {
      if (!userId) return;
      setRsvpBusyId(matchId);
      // Optimistic: reflect the choice immediately.
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, myStatus: status } : m))
      );
      try {
        const { error: rsvpError } = await supabase.from("rsvps").upsert(
          {
            match_id: matchId,
            user_id: userId,
            status,
            responded_at: new Date().toISOString(),
          },
          { onConflict: "match_id,user_id" }
        );
        if (rsvpError) throw new Error(rsvpError.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("dashboard.loadError"));
        // Roll back on failure.
        setMatches((prev) =>
          prev.map((m) => (m.id === matchId ? { ...m, myStatus: null } : m))
        );
      } finally {
        setRsvpBusyId(null);
      }
    },
    [userId, t]
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
          .select("name, tag")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (profile?.name) {
          setDisplayName(profile.name);
        }
        setTagMissing(Boolean(profile) && !profile?.tag);

        const uid = data.session.user.id;
        const [groupIds] = await Promise.all([
          loadGroups(uid),
          loadInvites(),
          loadDebt(),
        ]);
        await loadMatches(uid, groupIds ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("dashboard.loadError"));
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [router, loadGroups, loadInvites, loadDebt, loadMatches, t]);

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
          void loadMatches(userId, groupIds);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, groups, loadMatches]);

  const adminGroups = useMemo(
    () =>
      groups
        .filter((g) => g.role === "admin")
        .map((g) => ({ id: g.id, name: g.name })),
    [groups]
  );

  const { openByGroup, closedByGroup } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const open = new Map<string, GroupMatch[]>();
    const closed = new Map<string, GroupMatch[]>();
    // Source list is newest-first; upcoming reads best oldest-first.
    const ascending = [...matches].sort((a, b) =>
      `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
    );
    for (const match of ascending) {
      if (match.status === "open" && match.date >= today) {
        const list = open.get(match.groupId) ?? [];
        list.push(match);
        open.set(match.groupId, list);
      } else if (match.status === "closed") {
        const list = closed.get(match.groupId) ?? [];
        list.unshift(match); // newest closed first
        closed.set(match.groupId, list);
      }
    }
    return { openByGroup: open, closedByGroup: closed };
  }, [matches]);

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
        await loadMatches(userId, groupIds ?? []);
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

        {tagMissing && (
          <Link
            href="/dashboard/profile#tag"
            className="glass-panel flex items-center justify-between gap-3 rounded-2xl border-lime-500/30 bg-lime-500/5 p-4 transition hover:border-lime-500/50"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-500/15 text-lime-300">
                <Hash size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100">
                  {t("dashboard.tagReminderTitle")}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {t("dashboard.tagReminderBody")}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-lime-500 px-3 py-1.5 text-xs font-semibold text-slate-950">
              {t("dashboard.tagReminderAction")}
              <ChevronRight size={14} strokeWidth={2.25} />
            </span>
          </Link>
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
            <div className="space-y-5">
              {groups.map((group) => (
                <GroupCardItem
                  key={group.id}
                  group={group}
                  openMatches={openByGroup.get(group.id) ?? []}
                  closedMatches={closedByGroup.get(group.id) ?? []}
                  onDeleteMatch={handleDeleteMatch}
                  deletingMatchId={deletingMatchId}
                  onRsvp={handleQuickRsvp}
                  rsvpBusyId={rsvpBusyId}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {userId ? <CreateGroupPanel onCreated={() => loadGroups(userId)} /> : null}
      {userId ? (
        <CreateMatchPanel
          groups={adminGroups}
          onCreated={() =>
            loadMatches(
              userId,
              groups.map((g) => g.id)
            )
          }
        />
      ) : null}
      {userId ? <OnboardingPrompts /> : null}
      <BottomNav />
    </main>
  );
}

function GroupCardItem({
  group,
  openMatches,
  closedMatches,
  onDeleteMatch,
  deletingMatchId,
  onRsvp,
  rsvpBusyId,
}: {
  group: GroupCard;
  openMatches: GroupMatch[];
  closedMatches: GroupMatch[];
  onDeleteMatch: (id: string) => void;
  deletingMatchId: string | null;
  onRsvp: (matchId: string, status: "yes" | "no") => void;
  rsvpBusyId: string | null;
}) {
  const { t } = useI18n();
  const [showClosed, setShowClosed] = useState(false);
  const isAdmin = group.role === "admin";
  const hasMatches = openMatches.length > 0 || closedMatches.length > 0;
  return (
    <div className="space-y-2">
      <Link
        href={`/dashboard/groups/${group.id}`}
        className="glass-panel group flex items-center gap-3 rounded-2xl p-4 transition hover:border-lime-500/40"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-500/10 text-lime-400">
          <Users size={18} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-base font-semibold leading-tight">
              {group.name}
            </h4>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                isAdmin
                  ? "border-lime-500/30 bg-lime-500/20 text-lime-300"
                  : "border-white/10 bg-slate-800/80 text-slate-300"
              }`}
            >
              {isAdmin ? t("common.admin") : t("common.member")}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {t("dashboard.memberCount", { count: group.memberCount })} ·{" "}
            {group.adminName}
          </p>
        </div>
        <ChevronRight
          size={18}
          strokeWidth={1.75}
          className="shrink-0 text-lime-400 transition-transform group-hover:translate-x-1"
        />
      </Link>

      {hasMatches && (
        <div className="ml-3 space-y-2 border-l border-white/10 pl-4">
          {openMatches.map((match) => (
            <UpcomingMatchRow
              key={match.id}
              match={match}
              onRsvp={onRsvp}
              busy={rsvpBusyId === match.id}
            />
          ))}

          {closedMatches.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowClosed((v) => !v)}
                className="flex w-full items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 transition hover:text-slate-200"
              >
                {showClosed ? (
                  <ChevronUp size={14} strokeWidth={2} />
                ) : (
                  <ChevronDown size={14} strokeWidth={2} />
                )}
                {t("dashboard.closedMatches", { count: closedMatches.length })}
              </button>
              {showClosed &&
                closedMatches.map((match) => (
                  <ClosedMatchRow
                    key={match.id}
                    match={match}
                    isAdmin={isAdmin}
                    onDelete={onDeleteMatch}
                    deleting={deletingMatchId === match.id}
                  />
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ClosedMatchRow({
  match,
  isAdmin,
  onDelete,
  deleting,
}: {
  match: GroupMatch;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const { t, formatDate } = useI18n();
  return (
    <div className="glass-panel flex items-center justify-between gap-2 rounded-xl p-3 opacity-70 transition hover:opacity-100">
      <Link
        href={`/dashboard/groups/${match.groupId}/matches/${match.id}`}
        className="min-w-0 flex-1"
      >
        <div className="flex items-center gap-2 text-sm font-medium leading-tight text-slate-300">
          <CalendarClock
            size={14}
            strokeWidth={1.75}
            className="shrink-0 text-slate-500"
          />
          <span className="truncate">
            {formatDate(match.date, {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            })}{" "}
            · {match.time.slice(0, 5)}
            {match.endTime ? ` - ${match.endTime.slice(0, 5)}` : ""}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin size={12} strokeWidth={1.75} className="shrink-0" />
          <span className="line-clamp-1">{match.location}</span>
        </div>
      </Link>
      {isAdmin && (
        <button
          type="button"
          onClick={() => onDelete(match.id)}
          disabled={deleting}
          aria-label={t("matches.delete")}
          className="shrink-0 rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
        >
          <Trash2 size={15} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

function UpcomingMatchRow({
  match,
  onRsvp,
  busy,
}: {
  match: GroupMatch;
  onRsvp: (matchId: string, status: "yes" | "no") => void;
  busy: boolean;
}) {
  const { t, formatDate } = useI18n();
  const needsRsvp = match.myStatus === null;
  return (
    <div
      className={`glass-panel rounded-xl p-3 transition ${
        needsRsvp ? "border-lime-500/30" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/dashboard/groups/${match.groupId}/matches/${match.id}`}
          className="min-w-0 flex-1"
        >
          <div className="flex items-center gap-2 text-sm font-semibold leading-tight">
            <CalendarClock
              size={14}
              strokeWidth={2}
              className="shrink-0 text-lime-400"
            />
            <span className="truncate">
              {formatDate(match.date, {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              })}{" "}
              · {match.time.slice(0, 5)}
              {match.endTime ? ` - ${match.endTime.slice(0, 5)}` : ""}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin size={12} strokeWidth={1.75} className="shrink-0" />
            <span className="line-clamp-1">{match.location}</span>
          </div>
        </Link>
        {!needsRsvp && (
          <span
            className={`shrink-0 rounded-lg border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
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

      {needsRsvp && (
        <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
          <p className="mr-auto text-xs text-lime-300">
            {t("dashboard.upcomingJoinPrompt")}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => onRsvp(match.id, "yes")}
            className="rounded-lg bg-lime-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:scale-[1.03] active:scale-95 disabled:opacity-60"
          >
            {t("match.join")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onRsvp(match.id, "no")}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:border-slate-500 active:scale-95 disabled:opacity-60"
          >
            {t("match.skip")}
          </button>
        </div>
      )}
    </div>
  );
}
