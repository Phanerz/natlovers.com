import {NextRequest, NextResponse} from "next/server";
import {db, siteVisits} from "@/lib/db";

export const dynamic = "force-dynamic";

// Records one anonymous visit (country and phone or laptop) for a visitor who chose "Accept
// all" on the cookie notice. The country comes from the connection, never from the request
// body, and nothing is stored unless the consent cookie says "all". No IP address, name or
// other identifier is kept.
export async function POST(request: NextRequest) {
  if (request.cookies.get("natlovers_consent")?.value !== "all") {
    return new NextResponse(null, {status: 204});
  }
  const body = (await request.json().catch(() => null)) as {device?: string} | null;
  const device = body?.device === "phone" ? "phone" : body?.device === "laptop" ? "laptop" : null;
  const raw = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? request.headers.get("x-country-code");
  const country = raw && /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : null;
  if (!device || !country) {
    return new NextResponse(null, {status: 204});
  }
  try {
    await db.insert(siteVisits).values({country, device});
  } catch (error) {
    // Before the migration is run the table does not exist; the visit is simply not recorded.
    console.error("Visit not recorded", error);
  }
  return new NextResponse(null, {status: 204});
}
