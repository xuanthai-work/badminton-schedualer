"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Props = {
  url: string;
  name: string;
  sub?: string;
};

// The location block when a Maps link exists: one clickable card with a
// static-map thumbnail (resolved via /api/link-preview), the venue name and
// an optional badge (court number). A pin placeholder shows until/unless
// the thumbnail loads.
export default function MapsPreview({ url, name, sub }: Props) {
  const { t } = useI18n();
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const res = await fetch(
          `/api/link-preview?url=${encodeURIComponent(url)}`
        );
        const data = (await res.json().catch(() => null)) as {
          image?: string | null;
        } | null;
        if (active) setImage(data?.image ?? null);
      } catch {
        if (active) setImage(null);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-stretch overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 transition hover:border-lime-500/40"
    >
      <span className="relative h-20 w-24 shrink-0">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            unoptimized
            sizes="96px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-slate-800/60 text-lime-400/60">
            <MapPin size={24} strokeWidth={1.5} />
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-100">
            {name}
          </span>
          {sub && (
            <span className="shrink-0 rounded-full bg-lime-500/15 px-2 py-0.5 text-[11px] font-semibold text-lime-300">
              {sub}
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-lime-300">
          <ExternalLink size={11} strokeWidth={2} />
          {t("match.openMaps")}
        </span>
      </span>
    </a>
  );
}
