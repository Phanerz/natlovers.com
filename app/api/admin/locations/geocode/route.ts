import {NextRequest, NextResponse} from "next/server";
import {getSession, isAdminEmail} from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  return isAdminEmail(session?.user?.email);
}

// Proxies Nominatim (OSM's free geocoder) server-side rather than calling it
// from the browser: Nominatim requires a real identifying User-Agent (not
// the browser's default), and keeping the call server-side means the one
// request per "Find on map" click is the only traffic this ever sends, no
// risk of a client-side retry loop hammering their fair-use limit.
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({error: "Missing address."}, {status: 400});
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {"User-Agent": "natlovers.com-admin/1.0 (outlets location picker)"}
  });
  if (!response.ok) {
    return NextResponse.json({error: "Could not reach the geocoder. Please try again."}, {status: 502});
  }

  const results = (await response.json()) as {lat: string; lon: string; display_name: string}[];
  const match = results[0];
  if (!match) {
    return NextResponse.json({error: "No match found for that address. Try a broader query, or enter coordinates manually."}, {status: 404});
  }

  return NextResponse.json({
    latitude: Number(match.lat),
    longitude: Number(match.lon),
    displayName: match.display_name
  });
}
