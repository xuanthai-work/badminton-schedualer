"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BarChart3, ReceiptText, Trophy } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

type MemberStat = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  played: number;
  paid: number;
  owed: number;
};

type Stats = {
  totalMatches: number;
  totalSpend: number;
  members: MemberStat[];
};

type Props = {
  groupId: string;
};

export default function StatsPanel({ groupId }: Props) {
  const { t, formatVnd } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const run = async () => {
      const { data, error: rpcError } = await supabase.rpc("get_group_stats", {
        target_group_id: groupId,
      });
      if (!active) return;
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      const raw = data as {
        total_matches?: number;
        total_spend?: number;
        members?: Array<Record<string, unknown>>;
      } | null;
      setStats({
        totalMatches: Number(raw?.total_matches ?? 0),
        totalSpend: Number(raw?.total_spend ?? 0),
        members:
          raw?.members?.map((m) => ({
            userId: m.user_id as string,
            name: (m.name as string) ?? "",
            avatarUrl: (m.avatar_url as string | null) ?? null,
            played: Number(m.played ?? 0),
            paid: Number(m.paid ?? 0),
            owed: Number(m.owed ?? 0),
          })) ?? [],
      });
    };
    void run();
    return () => {
      active = false;
    };
  }, [groupId]);

  if (error) {
    return <p className="text-sm text-rose-400">{error}</p>;
  }
  if (!stats) {
    return <div className="glass-panel h-40 animate-pulse rounded-2xl" />;
  }

  const maxPlayed = Math.max(1, ...stats.members.map((m) => m.played));

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <BarChart3 size={15} strokeWidth={1.75} className="text-lime-400" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">
              {t("stats.totalMatches")}
            </p>
          </div>
          <p className="mt-1.5 text-2xl font-semibold text-slate-50">
            {stats.totalMatches}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <ReceiptText
              size={15}
              strokeWidth={1.75}
              className="text-lime-400"
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">
              {t("stats.totalSpend")}
            </p>
          </div>
          <p className="mt-1.5 text-2xl font-semibold text-slate-50">
            {formatVnd(stats.totalSpend)}
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <Trophy size={18} strokeWidth={1.75} className="text-lime-400" />
          <h2 className="text-base font-semibold">{t("stats.leaderboard")}</h2>
        </div>
        {stats.members.length === 0 ? (
          <p className="text-sm text-slate-400">{t("stats.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {stats.members.map((m, index) => (
              <li key={m.userId} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-center text-sm font-semibold text-slate-500">
                  {index + 1}
                </span>
                <StatAvatar name={m.name} url={m.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {m.name}
                    </p>
                    <p className="shrink-0 text-xs text-slate-400">
                      {t("stats.playedCount", { n: m.played })}
                    </p>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-lime-500/80"
                      style={{ width: `${(m.played / maxPlayed) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {t("stats.paidLabel")}:{" "}
                    <span className="text-lime-300/90">
                      {formatVnd(m.paid)}
                    </span>
                    {m.owed > 0 && (
                      <>
                        {" · "}
                        {t("stats.owedLabel")}:{" "}
                        <span className="text-amber-300/90">
                          {formatVnd(m.owed)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function StatAvatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10">
        <Image
          src={url}
          alt=""
          fill
          unoptimized
          sizes="36px"
          style={{ objectFit: "cover" }}
        />
      </span>
    );
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800/80 text-sm font-semibold text-lime-300">
      {initial}
    </span>
  );
}
