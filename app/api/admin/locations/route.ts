import {NextRequest, NextResponse} from "next/server";
import {createLocation, getAllLocationsForAdmin, setLocationActive, updateLocation} from "@/lib/admin-locations";
import {getSession, isAdminEmail} from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  return isAdminEmail(session?.user?.email);
}

// Admin-only. The public /outlets page reads active locations straight from
// lib/locations.ts server-side, never through this route.
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  const rows = await getAllLocationsForAdmin();
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  try {
    const formData = await request.formData();
    const location = await createLocation(formData);
    return NextResponse.json(location, {status: 201});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the location.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

// ?id=&action=activate|deactivate flips isActive (deactivate is the default
// "delete" from the admin list, see Section 4); a plain PATCH with a body
// updates the location's fields, same split as products' own PATCH.
export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({error: "Missing id."}, {status: 400});
  }
  const action = url.searchParams.get("action");

  try {
    if (action === "activate" || action === "deactivate") {
      const location = await setLocationActive(id, action === "activate");
      return NextResponse.json(location);
    }
    const formData = await request.formData();
    const location = await updateLocation(id, formData);
    return NextResponse.json(location);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the location.";
    return NextResponse.json({error: message}, {status: 400});
  }
}
