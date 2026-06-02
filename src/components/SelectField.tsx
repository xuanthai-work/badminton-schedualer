"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onChange: (next: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

export default function SelectField({
  value,
  onChange,
  options,
  placeholder = "— Chọn —",
  required,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex w-full items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-lime-500/70 disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "ring-2 ring-lime-500/70" : ""
        }`}
      >
        <span className={selected ? "text-slate-100" : "text-slate-500"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={`text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Hidden input preserves 'required' validation when the form submits. */}
      <input
        type="hidden"
        value={value}
        required={required}
        onChange={() => undefined}
      />

      {open && (
        <div className="glass-panel absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl p-2 shadow-2xl">
          <ul className="space-y-1">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      active
                        ? "bg-lime-500/20 text-lime-200"
                        : "text-slate-200 hover:bg-lime-500/10 hover:text-slate-100"
                    }`}
                  >
                    <span>{option.label}</span>
                    {active && (
                      <Check
                        size={16}
                        strokeWidth={2}
                        className="text-lime-400"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
