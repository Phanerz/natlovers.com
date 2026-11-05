import {NextRequest, NextResponse} from "next/server";
import {moveLocation, sortLocationsByDistance} from "@/lib/admin-locations";
import {getSession, isAdminEmail} from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  return isAdminEmail(session?.user?.email);
}

// Swaps one location's displayOrder with its immediate neighbor. Up/down
// buttons rather than drag-reorder (see moveLocation's own comment).
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const body = await request.json().catch(() => null);
  if (body?.mode === "distance") {
    try {
      return NextResponse.json(await sortLocationsByDistance());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sort locations.";
      return NextResponse.json({error: message}, {status: 400});
    }
  }
  const id = typeof body?.id === "string" ? body.id : null;
  const direction = body?.direction === "up" || body?.direction === "down" ? body.direction : null;
  if (!id || !direction) {
    return NextResponse.json({error: "Missing id or direction."}, {status: 400});
  }

  try {
    const locations = await moveLocation(id, direction);
    return NextResponse.json(locations);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reorder locations.";
    return NextResponse.json({error: message}, {status: 400});
  }
}
