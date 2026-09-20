import {NextResponse} from "next/server";
import {getActiveLocations} from "@/lib/locations";

// Public read of the active outlets, for the home page's Outlets section
// (a client component, so it can't call the DB directly the way
// app/outlets/page.tsx does). Same data, same ordering: main studio first.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const locations = await getActiveLocations();
    return NextResponse.json(locations, {
      headers: {"Cache-Control": "public, s-maxage=30, stale-while-revalidate=120"}
    });
  } catch {
    return NextResponse.json({error: "Could not load locations."}, {status: 500});
  }
}
