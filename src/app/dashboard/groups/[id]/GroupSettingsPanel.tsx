"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Pencil, Save, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  groupId: string;
  groupName: string;
  onRenamed: (newName: string) => void;
};

export default function GroupSettingsPanel({
  groupId,
  groupName,
  onRenamed,
}: Props) {
  const router = useRouter();

  const [name, setName] = useState(groupName);
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameMsg, setRenameMsg] = useState("");

  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    if (busy) return;
    setOpen(false);
    setConfirmText("");
    setError("");
  };

  const canDelete = confirmText.trim() === groupName.trim();

  const handleRename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setRenameMsg("Tên nhóm không được để trống.");
      return;
    }
    if (trimmed.length > 80) {
      setRenameMsg("Tên nhóm tối đa 80 ký tự.");
      return;
    }
    if (trimmed === groupName.trim()) {
      setRenameMsg("Tên không thay đổi.");
      return;
    }

    setRenameBusy(true);
    setRenameMsg("");
    try {
      const { error: updateError } = await supabase
        .from("groups")
        .update({ name: trimmed })
        .eq("id", groupId);
      if (updateError) throw new Error(updateError.message);

      onRenamed(trimmed);
      setRenameMsg("Đã đổi tên nhóm.");
    } catch (err) {
      setRenameMsg(err instanceof Error ? err.message : "Lỗi đổi tên nhóm.");
    } finally {
      setRenameBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setBusy(true);
    setError("");
    try {
      const { error: deleteError } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);
      if (deleteError) throw new Error(deleteError.message);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa nhóm.");
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="glass-panel rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <Pencil size={18} strokeWidth={1.75} className="text-lime-400" />
          <h2 className="text-base font-semibold">Tên nhóm</h2>
        </div>
        <form onSubmit={handleRename} className="space-y-3">
          <input
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tên nhóm"
            maxLength={80}
            required
          />
          {renameMsg && (
            <p
              className={`text-xs ${
                renameMsg.startsWith("Đã")
                  ? "text-lime-300"
                  : "text-rose-400"
              }`}
            >
              {renameMsg}
            </p>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.25)] transition hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
            disabled={renameBusy || name.trim() === groupName.trim()}
          >
            <Save size={14} strokeWidth={2} />
            {renameBusy ? "Đang lưu..." : "Lưu tên mới"}
          </button>
        </form>
      </div>

      <div className="glass-panel rounded-2xl border-rose-700/40 p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle
            size={18}
            strokeWidth={1.75}
            className="text-rose-300"
          />
          <h2 className="text-base font-semibold text-rose-300">
            Vùng nguy hiểm
          </h2>
        </div>
        <p className="text-sm text-slate-300">
          Xóa nhóm sẽ <strong>xóa vĩnh viễn</strong> tất cả lịch đánh, RSVP, và
          chi phí đã ghi nhận. Hành động này <strong>không thể hoàn tác</strong>.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-700/60 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/25 active:scale-95"
        >
          <Trash2 size={16} strokeWidth={1.75} />
          Xóa nhóm
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={(event) => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <div className="glass-panel w-full max-w-md rounded-2xl border-rose-700/40 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle
                size={20}
                strokeWidth={1.75}
                className="text-rose-300"
              />
              <h3 className="text-lg font-semibold text-rose-300">
                Xóa nhóm này?
              </h3>
            </div>
            <p className="text-sm text-slate-300">
              Bạn sắp xóa nhóm{" "}
              <span className="font-semibold text-slate-100">{groupName}</span>.
              Toàn bộ lịch đánh, RSVP và chi phí sẽ bị xóa.
            </p>
            <div className="mt-4 space-y-1 text-sm">
              <label className="ml-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Gõ tên nhóm để xác nhận
              </label>
              <input
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/70"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder={groupName}
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-3 text-xs text-rose-400">{error}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || busy}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-rose-400 active:scale-95 disabled:opacity-40 disabled:hover:bg-rose-500"
              >
                <Trash2 size={14} strokeWidth={2} />
                {busy ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
