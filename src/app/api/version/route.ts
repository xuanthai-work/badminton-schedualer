// Returns the commit SHA of the currently-live deployment. The client compares
// this against the SHA baked into its bundle (NEXT_PUBLIC_APP_VERSION) to detect
// when a newer version has shipped. Never cached, so it always reflects "live".
export const dynamic = "force-dynamic";

export async function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA || "dev";
  return Response.json(
    { version },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
