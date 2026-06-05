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

// Push copy localized per recipient (users.lang). Mirrors the in-app texts.
function render(
  rec: NotificationRecord,
  lang: "vi" | "en"
): { title: string; body: string; url: string } {
  const vi = lang === "vi";
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
        title: vi ? "Trận đấu mới" : "New match",
        body: vi
          ? `${g}: ${fmtDate(d.match_date)} lúc ${fmtTime(d.match_time)}`
          : `${g}: ${fmtDate(d.match_date)} at ${fmtTime(d.match_time)}`,
        url: matchUrl,
      };
    case "match_reminder":
      return {
        title: vi ? "Sắp đến giờ đánh 🏸" : "Match starting soon 🏸",
        body: vi
          ? `${g}: ${fmtTime(d.match_time)} hôm nay tại ${d.location ?? ""}`
          : `${g}: today at ${fmtTime(d.match_time)}, ${d.location ?? ""}`,
        url: matchUrl,
      };
    case "match_rsvp_nudge":
      return {
        title: vi ? "Bạn chưa chốt lịch hôm nay" : "You haven't RSVP'd yet",
        body: vi
          ? `${g} đánh lúc ${fmtTime(d.match_time)} tại ${d.location ?? ""} — tham gia không?`
          : `${g} plays at ${fmtTime(d.match_time)}, ${d.location ?? ""} — joining?`,
        url: matchUrl,
      };
    case "group_invite":
      return {
        title: vi ? "Lời mời vào nhóm" : "Group invite",
        body: vi
          ? `${d.inviter ?? ""} mời bạn vào nhóm ${g}`
          : `${d.inviter ?? ""} invited you to ${g}`,
        url: "/dashboard",
      };
    case "group_invite_accepted":
      return {
        title: vi ? "Thành viên mới" : "New member",
        body: vi
          ? `${d.member ?? ""} đã tham gia nhóm ${g}`
          : `${d.member ?? ""} joined ${g}`,
        url: matchUrl,
      };
    case "friend_request":
      return {
        title: vi ? "Lời mời kết bạn" : "Friend request",
        body: vi
          ? `${d.name ?? ""} đã gửi lời mời kết bạn`
          : `${d.name ?? ""} sent you a friend request`,
        url: "/dashboard/friends",
      };
    case "friend_accepted":
      return {
        title: vi ? "Kết bạn" : "Friends",
        body: vi
          ? `${d.name ?? ""} đã chấp nhận lời mời kết bạn`
          : `${d.name ?? ""} accepted your friend request`,
        url: "/dashboard/friends",
      };
    case "payment_confirmed":
      return {
        title: vi ? "Đã xác nhận thanh toán" : "Payment confirmed",
        body: vi
          ? `Khoản ${fmtAmount(d.amount)} cho nhóm ${g} đã được xác nhận`
          : `Your ${fmtAmount(d.amount)} payment for ${g} was confirmed`,
        url: matchUrl,
      };
    case "payment_submitted":
      return {
        title: vi ? "Chờ xác nhận thanh toán" : "Payment to confirm",
        body: vi
          ? `${d.name ?? ""} đã chuyển ${fmtAmount(d.amount)} cho nhóm ${g} — xác nhận nhé`
          : `${d.name ?? ""} sent ${fmtAmount(d.amount)} for ${g} — please confirm`,
        url: matchUrl,
      };
    case "attendance_request":
      return {
        title: vi ? "Xác nhận tham gia" : "Confirm attendance",
        body: vi
          ? `Bạn được thêm vào trận ${g} (${fmtDate(d.match_date)} ${fmtTime(d.match_time)}). Xác nhận tham gia?`
          : `You were added to a ${g} match (${fmtDate(d.match_date)} ${fmtTime(d.match_time)}). Did you play?`,
        url: matchUrl,
      };
    case "attendance_confirmed":
      return {
        title: d.attended
          ? vi
            ? "Đã xác nhận tham gia"
            : "Attendance confirmed"
          : vi
            ? "Báo vắng"
            : "Not attending",
        body: d.attended
          ? vi
            ? `${d.name ?? ""} xác nhận tham gia trận ở ${g}`
            : `${d.name ?? ""} confirmed playing in ${g}`
          : vi
            ? `${d.name ?? ""} báo không tham gia trận ở ${g}`
            : `${d.name ?? ""} said they didn't play in ${g}`,
        url: matchUrl,
      };
    default:
      return {
        title: "Badminton Scheduler",
        body: vi ? "Bạn có thông báo mới" : "You have a new notification",
        url: "/dashboard",
      };
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

  const [{ data: subs }, { data: recipient }] = await Promise.all([
    admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", record.user_id),
    admin.from("users").select("lang").eq("id", record.user_id).maybeSingle(),
  ]);

  if (!subs || subs.length === 0) {
    return Response.json({ sent: 0 });
  }

  const lang = recipient?.lang === "en" ? "en" : "vi";
  const message = JSON.stringify(render(record, lang));

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
