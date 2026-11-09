import {createHash} from "node:crypto";
import {and, count, eq, gt, sql} from "drizzle-orm";
import {db, rateLimitHits} from "@/lib/db";

// At most `limit` hits per key per window. The key is hashed, so no address or account id is
// stored here. Used by the waiting list and by order creation.
export async function allowRequest(rawKey: string, limit: number, windowMs: number): Promise<boolean> {
  const key = createHash("sha256").update(rawKey).digest("hex");
  const since = new Date(Date.now() - windowMs);
  const [row] = await db
    .select({value: count()})
    .from(rateLimitHits)
    .where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.createdAt, since)));
  if ((row?.value ?? 0) >= limit) return false;
  await db.insert(rateLimitHits).values({key});
  // Keep the table small.
  await db.delete(rateLimitHits).where(sql`${rateLimitHits.createdAt} < now() - interval '2 days'`);
  return true;
}
