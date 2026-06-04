"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Props = {
  url: string;
};

// Map block for a match's Google Maps link: a full-width static-map
// thumbnail (resolved via /api/link-preview) that opens the link, with a
// small "open maps" tag overlaid. Falls back to a plain link row while the
// thumbnail is loading or unavailable.
export default function MapsPreview({ url }: Props) {
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

  if (!image) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-lime-500/30 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold text-lime-300 transition hover:bg-lime-500/20"
      >
        <ExternalLink size={12} strokeWidth={2} />
        {t("match.openMaps")}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block h-28 w-full overflow-hidden rounded-xl border border-white/10 transition hover:border-lime-500/40"
    >
      <Image
        src={image}
        alt=""
        fill
        unoptimized
        sizes="(max-width: 768px) 100vw, 640px"
        style={{ objectFit: "cover" }}
      />
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-lime-300 backdrop-blur-sm">
        <ExternalLink size={11} strokeWidth={2} />
        {t("match.openMaps")}
      </span>
    </a>
  );
}
