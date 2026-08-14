import {getServerSession} from "next-auth/next";
import {NextRequest, NextResponse} from "next/server";
import {getAccountProfile, updateAccountProfile} from "@/lib/account";
import {authOptions, isAdminEmail} from "@/lib/auth";
import {getCustomerTelemetry} from "@/lib/customers";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const profile = await getAccountProfile(userId);
  if (!profile) {
    return NextResponse.json({error: "Account not found."}, {status: 404});
  }

  // isAdminEmail reads the server-only ADMIN_EMAILS allowlist, so this is
  // computed here rather than in the client — the profile page uses it to
  // decide whether to show business telemetry alongside the personal
  // profile (admin-only, never on a regular customer's own page). The
  // telemetry itself is the exact same query the Customers CRM page uses.
  const isAdmin = isAdminEmail(session?.user?.email);
  const adminTelemetry = isAdmin ? await getCustomerTelemetry() : null;

  return NextResponse.json({...profile, isAdmin, adminTelemetry});
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  try {
    const body = await request.json();
    const profile = await updateAccountProfile(userId, body);
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update account.";
    return NextResponse.json({error: message}, {status: 400});
  }
}
