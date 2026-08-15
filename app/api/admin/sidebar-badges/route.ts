import {NextResponse} from "next/server";
import {getSidebarBadgeCounts} from "@/lib/dashboard-stats";
import {getSession, isAdminEmail} from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const badges = await getSidebarBadgeCounts();
  return NextResponse.json(badges);
}
