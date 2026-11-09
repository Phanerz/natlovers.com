import {NextResponse} from "next/server";

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. With no secret set, the jobs refuse to
// run rather than being open to anyone.
export function rejectUnlessCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Cron refused: CRON_SECRET is not set");
    return NextResponse.json({error: "Not configured."}, {status: 503});
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  return null;
}
