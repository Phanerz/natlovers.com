import {createHash} from "node:crypto";
import {and, count, eq, gt, sql} from "drizzle-orm";
import {db, rateLimitHits} from "@/lib/db";

// At most `limit` hits per key per window. The key is hashed, so no address or account id is
// stored here. Used by the waiting list and by order creation.
//
// The count and the insert happen under a per-key advisory lock, so a burst of simultaneous
// requests cannot all read "under the limit" before any of them is recorded. The state lives in
// the database, so it is shared by every serverless instance.
export async function allowRequest(rawKey: string, limit: number, windowMs: number): Promise<boolean> {
  const key = createHash("sha256").update(rawKey).digest("hex");
  const since = new Date(Date.now() - windowMs);
  const allowed = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    const [row] = await tx
      .select({value: count()})
      .from(rateLimitHits)
      .where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.createdAt, since)));
    if ((row?.value ?? 0) >= limit) return false;
    await tx.insert(rateLimitHits).values({key});
    return true;
  });
  if (allowed) {
    // Keep the table small.
    await db.delete(rateLimitHits).where(sql`${rateLimitHits.createdAt} < now() - interval '2 days'`);
  }
  return allowed;
}
