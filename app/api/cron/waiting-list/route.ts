import {NextResponse} from "next/server";
import {logFailure} from "@/lib/safe-log";
import {jakartaDayOfMonth, jakartaMonth} from "@/lib/atelier-limits";
import {rejectUnlessCron} from "@/lib/cron-auth";
import {notifyWaitingList} from "@/lib/waiting-list";

export const dynamic = "force-dynamic";

// Scheduled for the last days of each UTC month at 17:10, which is just after midnight in Jakarta.
// It only acts when it is the first of the month there.
export async function GET(request: Request) {
  const rejected = rejectUnlessCron(request);
  if (rejected) return rejected;
  const now = new Date();
  if (jakartaDayOfMonth(now) !== 1) {
    return NextResponse.json({ok: true, skipped: "not the first of the month in Jakarta"});
  }
  try {
    const result = await notifyWaitingList(now, jakartaMonth(now).month);
    return NextResponse.json({ok: true, ...result});
  } catch (error) {
    logFailure("Waiting list job failed", error);
    return NextResponse.json({error: "Failed."}, {status: 500});
  }
}
