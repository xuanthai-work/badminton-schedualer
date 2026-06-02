"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  userId: string;
  bucket: "avatars" | "bank-qr";
  prefix: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void | Promise<void>;
  onRemoved: () => void | Promise<void>;
  shape?: "circle" | "square";
  size?: number;
  emptyLabel?: string;
};

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default function ImageUpload({
  userId,
  bucket,
  prefix,
  currentUrl,
  onUploaded,
  onRemoved,
  shape = "square",
  size = 192,
  emptyLabel = "Tải ảnh lên",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const triggerPick = () => {
    if (busy) return;
    fileRef.current?.click();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // reset so the same file can be picked again
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Chỉ cho phép tệp ảnh.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Ảnh vượt quá 5MB.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${userId}/${prefix}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: "3600",
        });
      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (!data.publicUrl) throw new Error("Không lấy được link ảnh.");

      await onUploaded(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onRemoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xoá ảnh.");
    } finally {
      setBusy(false);
    }
  };

  const isCircle = shape === "circle";

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={triggerPick}
        disabled={busy}
        className={`group relative overflow-hidden border border-slate-800 bg-slate-950/60 transition hover:border-lime-500/40 disabled:cursor-wait ${
          isCircle ? "rounded-full" : "rounded-2xl"
        }`}
        style={{ width: size, height: size }}
        aria-label={currentUrl ? "Đổi ảnh" : emptyLabel}
      >
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt=""
            fill
            unoptimized
            sizes={`${size}px`}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-500">
            {isCircle ? (
              <Camera size={28} strokeWidth={1.5} />
            ) : (
              <ImagePlus size={32} strokeWidth={1.5} />
            )}
            <span className="text-xs">{emptyLabel}</span>
          </div>
        )}

        {currentUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-slate-100 opacity-0 transition group-hover:bg-slate-950/60 group-hover:opacity-100">
            <div className="flex items-center gap-1 text-xs font-semibold">
              <Camera size={14} strokeWidth={1.75} />
              Đổi ảnh
            </div>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-xs text-slate-200">
            Đang tải...
          </div>
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {currentUrl && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-700/40 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-500/15 active:scale-95 disabled:opacity-60"
        >
          <Trash2 size={12} strokeWidth={1.75} />
          Xoá ảnh
        </button>
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
