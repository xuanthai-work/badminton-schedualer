import { createClient } from "@supabase/supabase-js";

// Bank webhooks are fire-and-forget and must never be cached/prerendered.
export const dynamic = "force-dynamic";

type WebhookBody = {
  bank?: string;
  amount?: number;
  content?: string;
  transactionId?: string;
  secret?: string;
};

// Canonical transfer-code syntax: "BS <shortMatch> <shortGuest>".
// Primary pattern per spec; the loose fallback also accepts guest ids that
// aren't strictly hex (anonymous guests use "g_..." ids).
const TRANSFER_CODE = /BS\s+([A-Fa-f0-9]{6,8})\s+([A-Fa-f0-9]{4,8})/i;
const TRANSFER_CODE_LOOSE = /BS\s+([A-Za-z0-9]{6,8})\s+([A-Za-z0-9]{4,8})/i;

const normalizeId = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

export async function POST(request: Request) {
  const expectedSecret = process.env.BANK_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let body: WebhookBody;
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ---- Authenticate the caller -------------------------------------------
  const providedSecret =
    request.headers.get("x-webhook-secret") ?? body.secret ?? "";
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ---- Extract the transfer code -----------------------------------------
  const content = typeof body.content === "string" ? body.content : "";
  const match =
    content.match(TRANSFER_CODE) ?? content.match(TRANSFER_CODE_LOOSE);
  if (!match) {
    return Response.json(
      { error: "Could not parse transfer code from content" },
      { status: 400 }
    );
  }
  const shortMatch = match[1].toUpperCase();
  const shortGuest = match[2].toUpperCase();

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: "Server is missing Supabase service credentials" },
      { status: 500 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ---- Locate the match (id::text starts with shortMatch) -----------------
  // A UUID's text ordering is bytewise, so all ids sharing the first 8 hex
  // chars fall inside this bounded range.
  const prefix = shortMatch.toLowerCase();
  const { data: matchRows, error: matchError } = await admin
    .from("matches")
    .select("id, title")
    .gte("id", `${prefix}-0000-0000-0000-000000000000`)
    .lte("id", `${prefix}-ffff-ffff-ffff-ffffffffffff`)
    .limit(1);

  if (matchError) {
    return Response.json({ error: matchError.message }, { status: 500 });
  }
  const matchedMatch = matchRows?.[0];
  if (!matchedMatch) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  // ---- Locate the guest within the match ---------------------------------
  const { data: guestRows, error: guestError } = await admin
    .from("match_guests")
    .select("guest_id, name, payment_status")
    .eq("match_id", matchedMatch.id);

  if (guestError) {
    return Response.json({ error: guestError.message }, { status: 500 });
  }

  const guest = (guestRows ?? []).find(
    (row) =>
      normalizeId(row.guest_id as string).startsWith(shortGuest) ||
      (row.guest_id as string).toUpperCase().startsWith(shortGuest)
  );

  if (!guest) {
    return Response.json({ error: "Guest not found" }, { status: 404 });
  }

  // ---- Idempotency: already confirmed -------------------------------------
  if (guest.payment_status === "confirmed") {
    return Response.json({
      ok: true,
      message: "Payment was already confirmed (Idempotent)",
      transactionId: body.transactionId ?? null,
      match: { id: matchedMatch.id, title: matchedMatch.title },
      guest: { guest_id: guest.guest_id, name: guest.name },
    });
  }

  // ---- Confirm the payment ------------------------------------------------
  const { error: updateError } = await admin
    .from("match_guests")
    .update({
      payment_status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("match_id", matchedMatch.id)
    .eq("guest_id", guest.guest_id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    message: "Payment confirmed",
    bank: body.bank ?? null,
    amount: body.amount ?? null,
    transactionId: body.transactionId ?? null,
    match: { id: matchedMatch.id, title: matchedMatch.title },
    guest: { guest_id: guest.guest_id, name: guest.name },
  });
}
