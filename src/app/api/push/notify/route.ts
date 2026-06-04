import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// web-push needs Node APIs (crypto), so force the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NotificationRecord = {
  user_id: string;
  type: string;
  group_id: string | null;
  match_id: string | null;
  data: Record<string, unknown> | null;
};

const fmtAmount = (v: unknown) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(v) || 0)} ₫`;

const fmtDate = (v: unknown) => {
  const s = String(v ?? "");
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}` : s;
};

const fmtTime = (v: unknown) => String(v ?? "").slice(0, 5);

// Vietnamese push copy (app default). Mirrors the in-app notification texts.
function render(rec: NotificationRecord): { title: string; body: string; url: string } {
  const d = rec.data ?? {};
  const g = String(d.group_name ?? "");
  const matchUrl =
    rec.group_id && rec.match_id
      ? `/dashboard/groups/${rec.group_id}/matches/${rec.match_id}`
      : rec.group_id
        ? `/dashboard/groups/${rec.group_id}`
        : "/dashboard";

  switch (rec.type) {
    case "match_created":
      return {
        title: "Trận đấu mới",
        body: `${g}: ${fmtDate(d.match_date)} lúc ${fmtTime(d.match_time)}`,
        url: matchUrl,
      };
    case "group_invite":
      return {
        title: "Lời mời vào nhóm",
        body: `${d.inviter ?? ""} mời bạn vào nhóm ${g}`,
        url: "/dashboard",
      };
    case "group_invite_accepted":
      return {
        title: "Thành viên mới",
        body: `${d.member ?? ""} đã tham gia nhóm ${g}`,
        url: matchUrl,
      };
    case "friend_request":
      return {
        title: "Lời mời kết bạn",
        body: `${d.name ?? ""} đã gửi lời mời kết bạn`,
        url: "/dashboard/friends",
      };
    case "friend_accepted":
      return {
        title: "Kết bạn",
        body: `${d.name ?? ""} đã chấp nhận lời mời kết bạn`,
        url: "/dashboard/friends",
      };
    case "payment_confirmed":
      return {
        title: "Đã xác nhận thanh toán",
        body: `Khoản ${fmtAmount(d.amount)} cho nhóm ${g} đã được xác nhận`,
        url: matchUrl,
      };
    case "payment_submitted":
      return {
        title: "Chờ xác nhận thanh toán",
        body: `${d.name ?? ""} đã chuyển ${fmtAmount(d.amount)} cho nhóm ${g} — xác nhận nhé`,
        url: matchUrl,
      };
    case "attendance_request":
      return {
        title: "Xác nhận tham gia",
        body: `Bạn được thêm vào trận ${g} (${fmtDate(d.match_date)} ${fmtTime(d.match_time)}). Xác nhận tham gia?`,
        url: matchUrl,
      };
    case "attendance_confirmed":
      return {
        title: d.attended ? "Đã xác nhận tham gia" : "Báo vắng",
        body: d.attended
          ? `${d.name ?? ""} xác nhận tham gia trận ở ${g}`
          : `${d.name ?? ""} báo không tham gia trận ở ${g}`,
        url: matchUrl,
      };
    default:
      return { title: "Badminton Scheduler", body: "Bạn có thông báo mới", url: "/dashboard" };
  }
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!process.env.PUSH_WEBHOOK_SECRET || secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!vapidPublic || !vapidPrivate || !supabaseUrl || !serviceKey) {
    return new Response("push not configured", { status: 500 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    vapidPublic,
    vapidPrivate
  );

  let record: NotificationRecord | null = null;
  try {
    const payload = (await request.json()) as { record?: NotificationRecord };
    record = payload.record ?? null;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (!record?.user_id) {
    return new Response("no record", { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", record.user_id);

  if (!subs || subs.length === 0) {
    return Response.json({ sent: 0 });
  }

  const message = JSON.stringify(render(record));

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message
        );
        sent += 1;
      } catch (err) {
        // 404/410 = subscription gone; clean it up.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    })
  );

  return Response.json({ sent });
}
