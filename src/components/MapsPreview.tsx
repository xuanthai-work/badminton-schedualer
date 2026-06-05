"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Props = {
  url: string;
};

type Preview = {
  image: string | null;
  lat: number | null;
  lng: number | null;
};

// Map block for a match's Google Maps link. Prefers Google's og:image
// static map (works locally; Google blocks datacenter IPs in prod), falls
// back to an OpenStreetMap embed at the coordinates parsed from the link,
// and finally to a plain link pill. The whole block opens the Google link.
export default function MapsPreview({ url }: Props) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const res = await fetch(
          `/api/link-preview?url=${encodeURIComponent(url)}`
        );
        const data = (await res.json().catch(() => null)) as Preview | null;
        if (active) setPreview(data);
      } catch {
        if (active) setPreview(null);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [url]);

  const openTag = (
    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-lime-300 backdrop-blur-sm">
      <ExternalLink size={11} strokeWidth={2} />
      {t("match.openMaps")}
    </span>
  );

  if (preview?.image) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block h-28 w-full overflow-hidden rounded-xl border border-white/10 transition hover:border-lime-500/40"
      >
        <Image
          src={preview.image}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 640px"
          style={{ objectFit: "cover" }}
        />
        {openTag}
      </a>
    );
  }

  if (preview?.lat != null && preview?.lng != null) {
    const { lat, lng } = preview;
    const bbox = [lng - 0.004, lat - 0.0022, lng + 0.004, lat + 0.0022]
      .map((n) => n.toFixed(6))
      .join("%2C");
    return (
      <div className="relative h-28 w-full overflow-hidden rounded-xl border border-white/10 transition hover:border-lime-500/40">
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`}
          className="h-full w-full border-0"
          loading="lazy"
          title="map"
        />
        {/* Tap anywhere on the mini map → open the Google link (the iframe
            itself would otherwise swallow the touch for panning). */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("match.openMaps")}
          className="absolute inset-0"
        />
        {openTag}
      </div>
    );
  }

  // Loading or no usable preview: full-width link row.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-lime-500/30 bg-lime-500/10 px-3 py-2.5 text-sm font-semibold text-lime-300 transition hover:bg-lime-500/20"
    >
      <ExternalLink size={14} strokeWidth={2} />
      {t("match.openMaps")}
    </a>
  );
}
