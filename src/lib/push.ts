import { supabase } from "@/lib/supabaseClient";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(VAPID_PUBLIC)
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function readyRegistration() {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

/** Existing subscription for this device, or null (also null when unsupported/failed). */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await readyRegistration();
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export type PushEnableResult = "ok" | "denied" | "error";

/** Full opt-in flow: permission → subscribe → persist. Must be called from a user gesture. */
export async function enablePush(): Promise<PushEnableResult> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const reg = await readyRegistration();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
    const json = sub.toJSON();

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return "error";

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: uid,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      },
      { onConflict: "endpoint" }
    );
    if (error) return "error";
    return "ok";
  } catch {
    return "error";
  }
}

/** Unsubscribe this device and remove its stored subscription. */
export async function disablePush(): Promise<boolean> {
  try {
    const reg = await readyRegistration();
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
}
