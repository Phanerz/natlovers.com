import {NextRequest, NextResponse} from "next/server";
import {getAddonAdminData, runAddonOp} from "@/lib/admin-addons";
import {getSession, isAdminEmail} from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getSession();
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  try {
    return NextResponse.json(await getAddonAdminData());
  } catch (error) {
    console.error("Add-ons admin load failed", error);
    return NextResponse.json({error: "Could not load add-ons. Has the add-ons migration been run?"}, {status: 500});
  }
}

// One JSON body per change: {op: "...", ...fields}. See lib/admin-addons.ts.
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  try {
    await runAddonOp(await request.json());
    return NextResponse.json(await getAddonAdminData());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save that change.";
    return NextResponse.json({error: message}, {status: 400});
  }
}
