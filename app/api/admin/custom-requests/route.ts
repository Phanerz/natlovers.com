import {NextRequest, NextResponse} from "next/server";
import {getSession, isAdminEmail} from "@/lib/auth";
import {listCustomRequests} from "@/lib/custom-requests";
import {customRequestStatusSchema} from "@/lib/custom-studio";
import {getStoreSettings, setCustomIntakePaused} from "@/lib/store-settings";

export const dynamic = "force-dynamic";

async function requireAdminEmail(): Promise<string | null> {
  const session = await getSession();
  const email = session?.user?.email;
  return isAdminEmail(email) && email ? email : null;
}

export async function GET(request: NextRequest) {
  if (!(await requireAdminEmail())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const parsedStatus = statusParam && statusParam !== "all" ? customRequestStatusSchema.safeParse(statusParam) : null;

  if (parsedStatus && !parsedStatus.success) {
    return NextResponse.json({error: "Unknown status filter."}, {status: 400});
  }

  const [requests, settings] = await Promise.all([
    listCustomRequests(parsedStatus?.data),
    getStoreSettings()
  ]);

  return NextResponse.json({requests, settings});
}

// The intake pause. Lives on the collection rather than on a request
// because it is a store-wide capacity switch, not a property of any one
// commission.
export async function PATCH(request: NextRequest) {
  const adminEmail = await requireAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.customIntakePaused !== "boolean") {
    return NextResponse.json({error: "customIntakePaused must be true or false."}, {status: 400});
  }

  try {
    const settings = await setCustomIntakePaused(
      body.customIntakePaused,
      adminEmail,
      typeof body.customIntakePausedMessage === "string" ? body.customIntakePausedMessage : null
    );
    return NextResponse.json({settings});
  } catch (error) {
    console.error("Failed to update custom intake setting:", error);
    return NextResponse.json({error: "Could not update the setting."}, {status: 500});
  }
}
