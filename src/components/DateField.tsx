"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar } from "lucide-react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  placeholder?: string;
};

export default function DateField({
  value,
  onChange,
  required,
  placeholder = "Chọn ngày",
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = value
    ? parse(value, "yyyy-MM-dd", new Date())
    : undefined;
  const display = selected
    ? format(selected, "EEE, dd/MM/yyyy", { locale: vi })
    : "";

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
          {display || placeholder}
        </span>
        <Calendar size={16} strokeWidth={1.75} className="text-slate-400" />
      </button>

      {/* Hidden input enforces 'required' validation when the form submits. */}
      <input
        type="hidden"
        value={value}
        required={required}
        onChange={() => undefined}
      />

      {open && (
        <div className="glass-panel absolute left-0 top-full z-50 mt-2 rounded-2xl p-2 shadow-2xl">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            locale={vi}
            weekStartsOn={1}
            showOutsideDays
          />
        </div>
      )}
    </div>
  );
}
