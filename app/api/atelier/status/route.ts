import {NextResponse} from "next/server";
import {getAvailability} from "@/lib/limits";

export const dynamic = "force-dynamic";

// Public. Says whether the month is full and what the per-order limits are. Never a count.
export async function GET() {
  return NextResponse.json(await getAvailability(), {headers: {"Cache-Control": "no-store"}});
}
