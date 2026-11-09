import {NextRequest, NextResponse} from "next/server";
import {logFailure} from "@/lib/safe-log";
import {allowRequest, joinWaitingList, parseEmail} from "@/lib/waiting-list";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = parseEmail(body?.email);
  if (!email) {
    return NextResponse.json({error: "invalid_email"}, {status: 400});
  }
  const lang = body?.language === "id" ? "id" : "en";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    // Five tries per address per hour, twenty per network address per hour, and a ceiling on the
    // whole form per hour so a spread-out attack cannot use it to flood strangers with email or
    // exhaust the sending quota the order emails depend on.
    const allowed =
      (await allowRequest(`wl-email:${email}`, 5, 3600_000)) &&
      (await allowRequest(`wl-ip:${ip}`, 20, 3600_000)) &&
      (await allowRequest("wl-global", 200, 3600_000));
    if (!allowed) {
      return NextResponse.json({error: "rate_limited"}, {status: 429});
    }
    await joinWaitingList(email, lang);
    return NextResponse.json({ok: true});
  } catch (error) {
    logFailure("Waiting list join failed", error);
    return NextResponse.json({error: "failed"}, {status: 500});
  }
}
