import Image from "next/image";

export default function InitialAvatar({
  name,
  url = null,
  size = 32,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  if (url) {
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-full border border-white/10"
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt=""
          fill
          unoptimized
          sizes={`${size}px`}
          style={{ objectFit: "cover" }}
        />
      </div>
    );
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800/80 font-semibold text-lime-300"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {initial}
    </div>
  );
}
