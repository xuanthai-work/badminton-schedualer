import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const getDisplayName = (user: User) => {
  const metadata = user.user_metadata;
  if (metadata && typeof metadata === "object") {
    const name = metadata["full_name"] ?? metadata["name"];
    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
  }
  if (user.email) {
    return user.email.split("@")[0];
  }
  return "Player";
};

const deriveUsernameFromEmail = (email: string) =>
  email.split("@")[0].toLowerCase().replace(/\./g, "_");

const getMetadataUsername = (user: User): string | null => {
  const metadata = user.user_metadata;
  if (metadata && typeof metadata === "object") {
    const u = metadata["username"];
    if (typeof u === "string" && u.trim()) {
      return u.trim();
    }
  }
  return null;
};

const randomSuffix = () =>
  Math.random().toString(36).slice(2, 6);

// Unique-violation error code from PostgREST/PG: 23505.
const isUniqueViolation = (error: { code?: string } | null | undefined) =>
  Boolean(error && error.code === "23505");

export const ensureUserProfile = async (user: User) => {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) return;

  if (!user.email) {
    throw new Error("Supabase user is missing an email address.");
  }

  const baseRow = {
    id: user.id,
    name: getDisplayName(user),
    email: user.email,
  };

  const preferred =
    getMetadataUsername(user) ?? deriveUsernameFromEmail(user.email);

  // Try the preferred username first; on collision, append a random
  // suffix up to a few times. Avoids racing other signups choosing the
  // same email-derived slug.
  const candidates = [
    preferred,
    `${preferred}_${randomSuffix()}`,
    `${preferred}_${randomSuffix()}`,
    `${preferred}_${randomSuffix()}`,
  ];

  for (const username of candidates) {
    const { error: insertError } = await supabase
      .from("users")
      .insert({ ...baseRow, username });

    if (!insertError) return;
    if (!isUniqueViolation(insertError)) {
      throw insertError;
    }
  }

  throw new Error(
    "Không thể tạo tên đăng nhập tự động. Vui lòng chọn lại."
  );
};
