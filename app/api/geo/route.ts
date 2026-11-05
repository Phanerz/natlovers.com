import {NextRequest, NextResponse} from "next/server";

// Never cached: the answer is about whoever is asking right now.
export const dynamic = "force-dynamic";

// The country the visitor's connection comes from, as the host reports it (Vercel sets
// x-vercel-ip-country; others use the CDN equivalents). The storefront uses it only to pick the
// first currency to show: Indonesia sees rupiah, everywhere else sees US dollars.
export async function GET(request: NextRequest) {
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-country-code") ??
    null;
  return NextResponse.json({country: country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null});
}
