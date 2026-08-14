import {getServerSession} from "next-auth/next";
import {NextRequest, NextResponse} from "next/server";
import {DateRangeKey, getDashboardStats} from "@/lib/dashboard-stats";
import {authOptions, isAdminEmail} from "@/lib/auth";

const validRanges: DateRangeKey[] = ["today", "7d", "month", "year", "all"];

function parseRange(value: string | null): DateRangeKey {
  return validRanges.includes(value as DateRangeKey) ? (value as DateRangeKey) : "all";
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const range = parseRange(request.nextUrl.searchParams.get("range"));

  try {
    const stats = await getDashboardStats(range);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to load dashboard stats:", error);
    return NextResponse.json({error: "Could not load dashboard stats."}, {status: 500});
  }
}
