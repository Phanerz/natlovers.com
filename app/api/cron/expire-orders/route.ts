import {NextResponse} from "next/server";
import {logFailure} from "@/lib/safe-log";
import {rejectUnlessCron} from "@/lib/cron-auth";
import {expireOverdueOrders} from "@/lib/orders";

export const dynamic = "force-dynamic";

// Marks overdue Awaiting transfer orders as Expired. Running it twice does nothing the second time,
// and it never touches any other status.
export async function GET(request: Request) {
  const rejected = rejectUnlessCron(request);
  if (rejected) return rejected;
  try {
    return NextResponse.json({ok: true, ...(await expireOverdueOrders())});
  } catch (error) {
    logFailure("Expire job failed", error);
    return NextResponse.json({error: "Failed."}, {status: 500});
  }
}
