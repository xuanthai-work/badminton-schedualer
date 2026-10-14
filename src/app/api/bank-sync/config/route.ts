import { createClient } from "@supabase/supabase-js";

// Returns the webhook URL + shared secret so a signed-in host can bind the
// Android app (via QR / deep link). Requires a valid Supabase access token.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.BANK_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!secret || !supabaseUrl || !anonKey) {
    return Response.json(
      { error: "Bank sync is not configured on the server" },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  return Response.json(
    {
      webhookUrl: `${origin}/api/webhook/bank-payment`,
      webhookSecret: secret,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
