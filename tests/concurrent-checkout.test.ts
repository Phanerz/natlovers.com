// Concurrency test for order placement. It needs a SCRATCH Postgres that already has the migrations
// applied, and it WRITES to it. Never point it at a real database:
//
//   DB_POSTGRES_URL=postgres://...scratch... npx tsx --test tests/concurrent-checkout.test.ts
//
// It refuses to run unless the database name contains "scratch" or "test".
import assert from "node:assert/strict";
import {after, before, test} from "node:test";

const url = process.env.DB_POSTGRES_URL ?? "";
const dbName = url.split("/").pop()?.split("?")[0] ?? "";
const safe = /scratch|test/i.test(dbName) && /localhost|127\.0\.0\.1/.test(url);

test("concurrent checkouts cannot take the last slot twice", {skip: safe ? false : "needs a local scratch database (DB_POSTGRES_URL)"}, async () => {
  const {db, products, users, storeSettings, orders} = await import("../lib/db");
  const {createOrder, LimitError} = await import("../lib/orders");
  const {eq, like} = await import("drizzle-orm");

  const tag = `ct-${Date.now()}`;
  const address = {label: "Home", recipientName: "T", phone: "+620000000", street: "S", city: "C", province: "", postalCode: "1", country: "Indonesia"};
  await db.insert(storeSettings).values({id: "default"}).onConflictDoNothing();
  await db.update(storeSettings).set({piecesMonthlyCap: 3, piecesMaxPerOrder: 5}).where(eq(storeSettings.id, "default"));
  await db.insert(products).values({slug: `${tag}-bag`, name: "Test bag", priceIdr: 100000, priceUsdCents: 1000, productType: "Bags"});

  const userIds: string[] = [];
  for (let i = 0; i < 6; i++) {
    const [user] = await db.insert(users).values({email: `${tag}-${i}@example.test`}).returning();
    userIds.push(user.id);
  }

  // Six customers each try to order two bags at the same moment. The cap is three, so exactly one
  // order of two can succeed (two + two would be four).
  const results = await Promise.allSettled(
    userIds.map((userId, i) =>
      createOrder(userId, [{slug: `${tag}-bag`, quantity: 2}], {bankName: "B", accountName: "A", accountNumber: "1"}, address, "IDR", {
        idempotencyKey: `${tag}-key-${i}`
      })
    )
  );
  const placed = results.filter((r) => r.status === "fulfilled");
  const refused = results.filter((r) => r.status === "rejected" && r.reason instanceof LimitError);
  assert.equal(placed.length, 1, "exactly one order should fit");
  assert.equal(refused.length, 5, "the rest should be refused by the limit, not by an error");

  // A double submit with the same key returns the same order.
  const first = placed[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof createOrder>>>;
  const winnerIndex = results.indexOf(first);
  const again = await createOrder(userIds[winnerIndex], [{slug: `${tag}-bag`, quantity: 2}], {bankName: "B", accountName: "A", accountNumber: "1"}, address, "IDR", {
    idempotencyKey: `${tag}-key-${winnerIndex}`
  });
  assert.equal(again.replayed, true);
  assert.equal(again.order.orderRef, first.value.order.orderRef);

  // Cleanup of the test rows only.
  for (const id of userIds) await db.delete(users).where(eq(users.id, id));
  await db.delete(products).where(like(products.slug, `${tag}%`));
  void orders;
});

before(() => undefined);
after(() => {
  setTimeout(() => process.exit(0), 200);
});
