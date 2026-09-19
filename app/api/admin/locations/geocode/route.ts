import {NextRequest, NextResponse} from "next/server";
import {getSession, isAdminEmail} from "@/lib/auth";
import {parseCoordinates} from "@/lib/parse-coordinates";

async function requireAdmin() {
  const session = await getSession();
  return isAdminEmail(session?.user?.email);
}

const USER_AGENT = "natlovers.com-admin/1.0 (outlets location picker)";

// Only these hosts are ever fetched when resolving a pasted link, so this route
// cannot be pointed at arbitrary URLs (it runs on the server).
const MAPS_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "www.google.com", "google.com", "maps.google.com"]);

// Nominatim (OSM's free geocoder) often does not know an exact Indonesian
// street number, and a query it cannot match returns nothing at all. So try
// the full address first, then the same without a house number ("No.107"),
// then progressively broader (dropping the street, then the next part, ...)
// down to the area. A broader hit is flagged approximate so the admin knows to
// fine-tune it or paste an exact pin.
function queryVariants(query: string) {
  const parts = query
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const variants: string[] = [];
  const add = (value: string) => {
    const cleaned = value.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").replace(/^,\s*|,\s*$/g, "").trim();
    if (cleaned && !variants.includes(cleaned)) variants.push(cleaned);
  };

  add(parts.join(", "));
  add(parts.join(", ").replace(/\b(?:no\.?|nomor)\s*\d+[a-z]?\b/gi, ""));
  for (let start = 1; start < parts.length && variants.length < 4; start += 1) {
    add(parts.slice(start).join(", "));
  }
  return variants.slice(0, 4);
}

async function searchNominatim(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {headers: {"User-Agent": USER_AGENT}, signal: AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error("geocoder unavailable");
  const results = (await response.json()) as {lat: string; lon: string; display_name: string}[];
  return results[0] ?? null;
}

// Follows a Google Maps short link (maps.app.goo.gl/...) by hand, one hop at a
// time, checking every hop against the host allow-list, until a URL that
// carries coordinates turns up.
async function resolveMapsLink(raw: string) {
  let current = raw;
  for (let hop = 0; hop < 6; hop += 1) {
    if (parseCoordinates(current)) return current;

    let url: URL;
    try {
      url = new URL(current);
    } catch {
      return null;
    }
    if (url.protocol !== "https:" || !MAPS_HOSTS.has(url.hostname)) return null;

    const response = await fetch(url, {
      redirect: "manual",
      headers: {"User-Agent": "Mozilla/5.0 (compatible; natlovers.com-admin/1.0)"},
      signal: AbortSignal.timeout(8000)
    });
    const next = response.headers.get("location");
    if (!next) return current;
    current = new URL(next, url).toString();
  }
  return current;
}

// Two jobs, both admin-only and both server-side (Nominatim needs a real
// identifying User-Agent, and short links have to be followed without the
// browser's CORS limits):
//   { query }  search an address, with the fallbacks above
//   { url }    read coordinates out of a pasted Google Maps link
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const body = await request.json().catch(() => null);

  const link = typeof body?.url === "string" ? body.url.trim() : "";
  if (link) {
    try {
      const resolved = await resolveMapsLink(link);
      const coordinates = resolved ? parseCoordinates(resolved) : null;
      if (!coordinates) {
        return NextResponse.json(
          {error: "Could not read a location from that link. In Google Maps, right-click the exact spot and copy the coordinates, then paste those instead."},
          {status: 404}
        );
      }
      return NextResponse.json({...coordinates, displayName: "From the pasted Google Maps link"});
    } catch {
      return NextResponse.json({error: "Could not open that link. Please try again, or paste the coordinates instead."}, {status: 502});
    }
  }

  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({error: "Missing address."}, {status: 400});
  }

  const variants = queryVariants(query);
  try {
    for (let index = 0; index < variants.length; index += 1) {
      // Nominatim's fair-use policy is one request per second.
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
      const match = await searchNominatim(variants[index]);
      if (match) {
        return NextResponse.json({
          latitude: Number(Number(match.lat).toFixed(6)),
          longitude: Number(Number(match.lon).toFixed(6)),
          displayName: match.display_name,
          approximate: index > 0,
          matchedQuery: variants[index]
        });
      }
    }
  } catch {
    return NextResponse.json({error: "Could not reach the geocoder. Please try again."}, {status: 502});
  }

  return NextResponse.json(
    {error: "No match found for that address. Paste a Google Maps link or coordinates below, or type the latitude and longitude yourself."},
    {status: 404}
  );
}
