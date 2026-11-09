import {createHash, timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";

// Compares in constant time. Both sides are hashed first so the buffers are always the same length
// and the comparison never reveals how many leading characters were right.
export function cronAuthorised(header: string | null, secret: string): boolean {
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  const given = createHash("sha256").update(header ?? "").digest();
  return timingSafeEqual(expected, given);
}

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. With no secret set, the jobs refuse to
// run rather than being open to anyone.
export function rejectUnlessCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Cron refused: CRON_SECRET is not set");
    return NextResponse.json({error: "Not configured."}, {status: 503});
  }
  if (!cronAuthorised(request.headers.get("authorization"), secret)) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  return null;
}
