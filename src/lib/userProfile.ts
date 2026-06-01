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

export const ensureUserProfile = async (user: User) => {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    if (!user.email) {
      throw new Error("Supabase user is missing an email address.");
    }

    const { error: insertError } = await supabase.from("users").insert({
      id: user.id,
      name: getDisplayName(user),
      email: user.email,
    });

    if (insertError) {
      throw insertError;
    }
  }
};
