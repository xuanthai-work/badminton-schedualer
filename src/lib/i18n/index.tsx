"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Locale } from "date-fns";
import { vi as viDateLocale, enUS as enDateLocale } from "date-fns/locale";
import {
  DEFAULT_LANG,
  dictionaries,
  type Lang,
} from "./translations";

const STORAGE_KEY = "bs.lang";

const INTL_LOCALE: Record<Lang, string> = {
  vi: "vi-VN",
  en: "en-US",
};

const DATE_FNS_LOCALE: Record<Lang, Locale> = {
  vi: viDateLocale,
  en: enDateLocale,
};

type Vars = Record<string, string | number>;

type I18nValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  /** Translate a dot-path key, interpolating {tokens} from vars. */
  t: (key: string, vars?: Vars) => string;
  /** date-fns Locale bound to the current language (for react-day-picker). */
  dateLocale: Locale;
  /** Format a number as VND in the current locale. */
  formatVnd: (value: number) => string;
  /** Format a yyyy-MM-dd string as a localized date. */
  formatDate: (
    value: string,
    options?: Intl.DateTimeFormatOptions
  ) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function resolve(lang: Lang, key: string): string {
  const parts = key.split(".");
  let node: unknown = dictionaries[lang];
  for (const part of parts) {
    if (node && typeof node === "object" && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return key; // Missing key — surface the key so it's obvious in dev.
    }
  }
  return typeof node === "string" ? node : key;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Always start from the default so the server and first client render match;
  // the stored preference is applied right after mount.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const applyStored = async () => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "vi" || stored === "en") {
        setLangState(stored);
      }
    };
    void applyStored();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const t = (key: string, vars?: Vars) =>
      interpolate(resolve(lang, key), vars);

    return {
      lang,
      setLang,
      t,
      dateLocale: DATE_FNS_LOCALE[lang],
      formatVnd: (val: number) => {
        if (Number.isNaN(val)) return "0 ₫";
        return new Intl.NumberFormat(INTL_LOCALE[lang], {
          style: "currency",
          currency: "VND",
          maximumFractionDigits: 0,
        }).format(val);
      },
      formatDate: (val: string, options?: Intl.DateTimeFormatOptions) => {
        const parsed = new Date(`${val}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return val;
        return parsed.toLocaleDateString(
          INTL_LOCALE[lang],
          options ?? {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }
        );
      },
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

export type { Lang };
