"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n";

type Props = {
  onCreated: () => void;
};

export default function CreateGroupPanel({ onCreated }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error) {
      return err.message;
    }
    if (err && typeof err === "object" && "message" in err) {
      const message = (err as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }
    return t("createGroup.errFailed");
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("createGroup.errEmpty"));
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw new Error(userError.message);
      }
      if (!userData.user) {
        throw new Error(t("createGroup.errSessionExpired"));
      }

      const currentUserId = userData.user.id;

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({ name: trimmed, created_by: currentUserId })
        .select("id")
        .single();

      if (groupError) {
        throw new Error(groupError.message);
      }
      if (!group) {
        throw new Error(t("createGroup.errCannotCreate"));
      }

      const { error: memberError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: currentUserId,
        role: "admin",
      });

      if (memberError) {
        throw new Error(memberError.message);
      }

      setName("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed bottom-24 right-6 z-40 rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-lime-500/20 transition hover:shadow-[0_0_24px_rgba(163,230,53,0.45)]"
        onClick={() => setOpen(true)}
      >
        {t("createGroup.fab")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              setOpen(false);
            }
          }}
        >
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("createGroup.title")}</h2>
              <button
                type="button"
                className="text-sm text-slate-400 hover:text-slate-200"
                onClick={() => setOpen(false)}
              >
                {t("common.close")}
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1 text-sm">
                <label className="text-slate-300">
                  {t("createGroup.nameLabel")}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500/70"
                  placeholder={t("createGroup.namePlaceholder")}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
                  onClick={() => setOpen(false)}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? t("createGroup.creating") : t("createGroup.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
