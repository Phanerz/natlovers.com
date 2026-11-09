import {NextResponse} from "next/server";
import {getPaymentProvider} from "@/lib/payments";
import {applyPaymentEvent} from "@/lib/payments/service";
import {recordFailure, tooManyFailures} from "@/lib/rate-limit";
import {logFailure} from "@/lib/safe-log";

export const dynamic = "force-dynamic";

// Failed attempts (a wrong or missing token) are counted per network address. Past this many in the
// window, that address is turned away. Valid requests are never counted, so Xendit is never slowed.
const MAX_FAILURES = 20;
const FAILURE_WINDOW_MS = 10 * 60_000;

// Xendit tells us a payment changed. Nothing here is trusted until the callback token matches, and
// even then the amount and currency must equal what we stored. Answers are deliberately plain: they
// never say which check failed, and never echo anything from the request.
export async function POST(request: Request) {
  const provider = getPaymentProvider();
  if (!provider) {
    return NextResponse.json({error: "Not configured."}, {status: 503});
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  try {
    if (ip && (await tooManyFailures(`webhook:${ip}`, MAX_FAILURES, FAILURE_WINDOW_MS))) {
      return NextResponse.json({error: "Too many requests."}, {status: 429});
    }
  } catch (error) {
    // If the counter cannot be read, carry on: the token check below is the real protection.
    logFailure("Webhook failure counter unavailable", error);
  }

  if (!provider.verifyWebhook(request.headers)) {
    if (ip) await recordFailure(`webhook:${ip}`).catch((error) => logFailure("Webhook failure not recorded", error));
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const body = await request.json().catch(() => null);
  const event = provider.parseWebhook(request.headers, body);
  if (!event) {
    return NextResponse.json({error: "Rejected."}, {status: 400});
  }

  try {
    const outcome = await applyPaymentEvent(event);
    if (outcome.result === "rejected") {
      return NextResponse.json({error: "Rejected."}, {status: 400});
    }
    // Paid, expired, repeated or unknown: all answered the same, so Xendit stops retrying and
    // nothing is revealed about which references exist.
    return NextResponse.json({ok: true});
  } catch (error) {
    // A real failure on our side: a non-2xx makes Xendit try again later.
    logFailure("Payment webhook failed", error);
    return NextResponse.json({error: "Failed."}, {status: 500});
  }
}
