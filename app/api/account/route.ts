import {NextRequest, NextResponse} from "next/server";
import {getAccountProfile, updateAccountProfile, updateAdminWidgets} from "@/lib/account";
import {sanitizeWidgetKeys} from "@/lib/admin-widgets";
import {getSession, isAdminEmail} from "@/lib/auth";
import {getCustomerTelemetry} from "@/lib/customers";
import {getDashboardStats} from "@/lib/dashboard-stats";

export async function GET() {
  const session = await getSession();
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
  // telemetry/stats are the exact same live queries the Customers CRM and
  // main Dashboard pages use — "all time" here since the account page has
  // no date-range picker of its own.
  const isAdmin = isAdminEmail(session?.user?.email);
  // Sequential, not Promise.all: getCustomerTelemetry fans out 2 queries and
  // getDashboardStats("all") fans out ~9 more internally — running both
  // concurrently bursts past this pool's connection cap under contention,
  // same tradeoff already made in /api/admin/dashboard-stats.
  const adminTelemetry = isAdmin ? await getCustomerTelemetry() : null;
  const adminStats = isAdmin ? await getDashboardStats("all") : null;
  const adminWidgets = isAdmin ? sanitizeWidgetKeys(profile.adminWidgets) : null;

  return NextResponse.json({...profile, isAdmin, adminTelemetry, adminStats, adminWidgets});
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  try {
    const body = await request.json();

    // A distinct action, same pattern as /api/account/addresses' "set_default"
    // — this never touches name/phone/bio, and is only ever honored for a
    // caller the allowlist actually confirms is an admin right now, not one
    // the client merely claims to be.
    if (body?.action === "set_admin_widgets") {
      if (!isAdminEmail(session?.user?.email)) {
        return NextResponse.json({error: "Unauthorized."}, {status: 403});
      }
      const widgets = await updateAdminWidgets(userId, body?.widgets);
      return NextResponse.json({adminWidgets: widgets});
    }

    const profile = await updateAccountProfile(userId, body);
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update account.";
    return NextResponse.json({error: message}, {status: 400});
  }
}
