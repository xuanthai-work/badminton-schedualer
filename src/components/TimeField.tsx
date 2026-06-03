"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Props = {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
};

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0")
);

export default function TimeField({ value, onChange, required }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  const [h, m] = value ? value.split(":") : ["", ""];
  const hour = HOURS.includes(h) ? h : "";
  const minute = MINUTES.includes(m) ? m : "";

  const display = value && hour && minute ? `${hour}:${minute}` : "";

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll the active item into view when the popover opens.
  useLayoutEffect(() => {
    if (!open) return;
    const scrollActiveIntoView = (list: HTMLDivElement | null) => {
      if (!list) return;
      const active = list.querySelector<HTMLButtonElement>("[data-active='true']");
      if (active) {
        active.scrollIntoView({ block: "center" });
      }
    };
    scrollActiveIntoView(hourListRef.current);
    scrollActiveIntoView(minuteListRef.current);
  }, [open]);

  const setHour = (next: string) => {
    onChange(`${next}:${minute || "00"}`);
  };
  const setMinute = (next: string) => {
    if (!hour) {
      onChange(`00:${next}`);
    } else {
      onChange(`${hour}:${next}`);
    }
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex w-full items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-left text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-lime-500/70 ${
          open ? "ring-2 ring-lime-500/70" : ""
        }`}
      >
        <span className={display ? "text-slate-100" : "text-slate-500"}>
          {display || t("fields.selectTime")}
        </span>
        <Clock size={16} strokeWidth={1.75} className="text-slate-400" />
      </button>

      {/* Hidden input enforces 'required' validation when the form submits. */}
      <input
        type="hidden"
        value={value}
        required={required}
        onChange={() => undefined}
      />

      {open && (
        <div className="solid-panel absolute left-0 top-full z-50 mt-2 grid grid-cols-2 gap-2 rounded-2xl p-2 shadow-2xl">
          <Column
            innerRef={hourListRef}
            label={t("fields.hour")}
            items={HOURS}
            value={hour}
            onSelect={setHour}
          />
          <Column
            innerRef={minuteListRef}
            label={t("fields.minute")}
            items={MINUTES}
            value={minute}
            onSelect={setMinute}
          />
        </div>
      )}
    </div>
  );
}

function Column({
  innerRef,
  label,
  items,
  value,
  onSelect,
}: {
  innerRef: React.RefObject<HTMLDivElement | null>;
  label: string;
  items: string[];
  value: string;
  onSelect: (next: string) => void;
}) {
  return (
    <div>
      <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <div
        ref={innerRef}
        className="grid h-44 w-20 grid-cols-1 gap-1 overflow-y-auto pr-1"
      >
        {items.map((item) => {
          const active = item === value;
          return (
            <button
              key={item}
              type="button"
              data-active={active}
              onClick={() => onSelect(item)}
              className={`rounded-lg px-2 py-1.5 text-sm transition ${
                active
                  ? "bg-lime-500 font-semibold text-slate-950"
                  : "text-slate-200 hover:bg-lime-500/10 hover:text-slate-100"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
