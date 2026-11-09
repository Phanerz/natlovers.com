import {NextResponse} from "next/server";
import {getSession} from "@/lib/auth";
import {ensureInvoice} from "@/lib/payments/service";
import {allowRequest} from "@/lib/rate-limit";
import {logFailure} from "@/lib/safe-log";

export const dynamic = "force-dynamic";

// The "Pay now" button on the customer order page. Returns the hosted payment page for the signed-in
// customer own unpaid order, making a fresh one if the old page has expired.
export async function POST(_request: Request, {params}: {params: Promise<{ref: string}>}) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  const {ref} = await params;
  try {
    if (!(await allowRequest(`pay:${userId}`, 20, 3600_000))) {
      return NextResponse.json({error: "rate_limited"}, {status: 429});
    }
    const result = await ensureInvoice(decodeURIComponent(ref), {userId});
    if (!result.ok) {
      const status = result.error === "not_found" ? 404 : result.error === "not_payable" ? 409 : 503;
      return NextResponse.json({error: result.error}, {status});
    }
    return NextResponse.json({url: result.url});
  } catch (error) {
    logFailure("Pay now failed", error);
    return NextResponse.json({error: "unavailable"}, {status: 503});
  }
}
