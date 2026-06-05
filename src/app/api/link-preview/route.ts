import { NextRequest, NextResponse } from "next/server";

// Resolves a Google Maps link server-side for the client preview card:
// og:image when Google serves it (it doesn't to datacenter IPs in prod) and,
// more reliably, the place coordinates parsed from the resolved URL — the
// client then renders an OpenStreetMap embed. Host is allowlisted to Google
// Maps domains only — this is not a generic proxy.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);

// google.com, www.google.com, maps.google.com, google.com.vn, google.de, ...
const GOOGLE_HOST =
  /^([a-z0-9-]+\.)*google\.(com|com\.[a-z]{2}|co\.[a-z]{2}|[a-z]{2})$/;

const hostAllowed = (hostname: string) =>
  SHORT_HOSTS.has(hostname) || GOOGLE_HOST.test(hostname);

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url") ?? "";

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ image: null }, { status: 400 });
  }
  if (target.protocol !== "https:" || !hostAllowed(target.hostname)) {
    return NextResponse.json({ image: null }, { status: 400 });
  }

  try {
    const res = await fetch(target.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        // A browser UA makes Google return the HTML shell with OG tags.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "vi,en;q=0.8",
      },
    });

    // Short links redirect — the final host must still be Google's.
    const finalUrl = res.url;
    if (!res.ok || !hostAllowed(new URL(finalUrl).hostname)) {
      return NextResponse.json({ image: null, lat: null, lng: null });
    }

    const html = await res.text();
    const match = html.match(
      /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/
    ) ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/);
    const image = match ? match[1].replace(/&amp;/g, "&") : null;

    // Coordinates: the place pin (!3d..!4d..) is precise; the @lat,lng
    // viewport is a good fallback. Check the resolved URL first, then HTML.
    const haystack = `${decodeURIComponent(finalUrl)}\n${html.slice(0, 200_000)}`;
    const pin = haystack.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
    const viewport = haystack.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
    const coords = pin ?? viewport;
    const lat = coords ? Number(coords[1]) : null;
    const lng = coords ? Number(coords[2]) : null;

    return NextResponse.json(
      { image, lat, lng },
      {
        headers: {
          // Place previews barely change; cache hard at the CDN.
          "Cache-Control":
            "public, s-maxage=604800, stale-while-revalidate=86400",
        },
      }
    );
  } catch {
    return NextResponse.json({ image: null, lat: null, lng: null });
  }
}
