import type { LucideIcon } from "lucide-react";

// Friendly empty state: an icon, a short headline, a calm one-line
// explanation, and an optional call-to-action that points the user forward.

export default function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon;
  title?: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/10 text-lime-400">
        <Icon size={22} strokeWidth={1.75} />
      </span>
      {title && (
        <p className="text-sm font-semibold text-slate-100">{title}</p>
      )}
      <p className="max-w-xs text-xs leading-relaxed text-slate-400">
        {message}
      </p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
