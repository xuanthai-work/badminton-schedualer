"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, User, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Item = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  matches: (pathname: string) => boolean;
};

const items: Item[] = [
  {
    href: "/dashboard",
    labelKey: "nav.home",
    icon: Home,
    matches: (path) =>
      path === "/dashboard" || path.startsWith("/dashboard/groups"),
  },
  {
    href: "/dashboard/debts",
    labelKey: "nav.debts",
    icon: Wallet,
    matches: (path) => path.startsWith("/dashboard/debts"),
  },
  {
    href: "/dashboard/friends",
    labelKey: "nav.friends",
    icon: Users,
    matches: (path) => path.startsWith("/dashboard/friends"),
  },
  {
    href: "/dashboard/profile",
    labelKey: "nav.account",
    icon: User,
    matches: (path) => path.startsWith("/dashboard/profile"),
  },
];

export default function BottomNav() {
  const pathname = usePathname() ?? "";
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-white/10 bg-slate-950/80 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl shadow-[0_-4px_20px_rgba(163,230,53,0.06)]">
      {items.map((item) => {
        const active = item.matches(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1 transition active:scale-90 ${
              active
                ? "bg-lime-500/10 text-lime-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2 : 1.75} />
            <span
              className={`text-[10px] ${
                active ? "font-semibold" : "font-medium"
              }`}
            >
              {t(item.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
