import {NextRequest, NextResponse} from "next/server";
import {DateRangeKey, getBestSellingProducts, getDashboardStats, getRecentOrders, getSalesSeries} from "@/lib/dashboard-stats";
import {getSession, isAdminEmail} from "@/lib/auth";

const validRanges: DateRangeKey[] = ["today", "7d", "month", "year", "all"];

function parseRange(value: string | null): DateRangeKey {
  return validRanges.includes(value as DateRangeKey) ? (value as DateRangeKey) : "all";
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const range = parseRange(request.nextUrl.searchParams.get("range"));

  try {
    // Sequential rather than Promise.all: getDashboardStats alone already
    // fans out ~8 queries in parallel, and stacking 3 more query groups on
    // top of that from a single request bursts well past this pool's
    // connection cap under any real contention on the shared Supabase
    // pooler — better to trade a little latency for not being the request
    // that tips a contended pool over into everyone queuing.
    const stats = await getDashboardStats(range);
    const salesSeries = await getSalesSeries(range);
    const recentOrders = await getRecentOrders(5);
    const bestSellingProducts = await getBestSellingProducts(5);
    return NextResponse.json({...stats, salesSeries, recentOrders, bestSellingProducts});
  } catch (error) {
    console.error("Failed to load dashboard stats:", error);
    return NextResponse.json({error: "Could not load dashboard stats."}, {status: 500});
  }
}
