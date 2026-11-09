// Holds, expiry and per-account limits. Needs a SCRATCH Postgres with the schema applied; it writes
// to it. Same guard as the concurrency test:
//   DB_POSTGRES_URL=postgres://...localhost.../natlovers_scratch npx tsx --test tests/order-holds.test.ts
import assert from "node:assert/strict";
import {after, test} from "node:test";
import {checkOpenOrders, extendedExpiry, MAX_OPEN_UNPAID_ORDERS, orderExpiry} from "../lib/atelier-limits";

test("expiry: 24 hours for rupiah, 72 hours for dollars, extension adds 72 hours", () => {
  const created = new Date("2026-11-09T10:00:00Z");
  assert.equal(orderExpiry(created, "IDR").toISOString(), "2026-11-10T10:00:00.000Z");
  assert.equal(orderExpiry(created, "USD").toISOString(), "2026-11-12T10:00:00.000Z");
  // Extending a live hold adds to its current expiry; an overdue one counts from now.
  assert.equal(extendedExpiry(new Date("2026-11-12T10:00:00Z"), new Date("2026-11-11T00:00:00Z")).toISOString(), "2026-11-15T10:00:00.000Z");
  assert.equal(extendedExpiry(new Date("2026-11-01T10:00:00Z"), new Date("2026-11-11T00:00:00Z")).toISOString(), "2026-11-14T00:00:00.000Z");
  assert.equal(extendedExpiry(null, new Date("2026-11-11T00:00:00Z")).toISOString(), "2026-11-14T00:00:00.000Z");
});

test("an account may have two open unpaid orders", () => {
  assert.equal(MAX_OPEN_UNPAID_ORDERS, 2);
  assert.equal(checkOpenOrders(0), true);
  assert.equal(checkOpenOrders(1), true);
  assert.equal(checkOpenOrders(2), false);
});

const url = process.env.DB_POSTGRES_URL ?? "";
const dbName = url.split("/").pop()?.split("?")[0] ?? "";
const safe = /scratch|test/i.test(dbName) && /localhost|127\.0\.0\.1/.test(url);

test("database: open-order cap, 72 hour dollar hold, extension, expiry frees slots, rate limit", {skip: safe ? false : "needs a local scratch database (DB_POSTGRES_URL)"}, async () => {
  const {db, products, users, storeSettings, orders, rateLimitHits} = await import("../lib/db");
  const {createOrder, OpenOrdersError, extendOrderHold, expireOverdueOrders, cancelOrder} = await import("../lib/orders");
  const {getMonthlyUsage} = await import("../lib/limits");
  const {allowRequest} = await import("../lib/rate-limit");
  const {eq, like} = await import("drizzle-orm");

  const tag = `oh-${Date.now()}`;
  const address = {label: "Home", recipientName: "T T", phone: "+620000000", street: "S", city: "C", province: "", postalCode: "1", country: "Indonesia"};
  const bank = {bankName: "B", accountName: "A", accountNumber: "1"};
  await db.insert(storeSettings).values({id: "default"}).onConflictDoNothing();
  await db.update(storeSettings).set({piecesMonthlyCap: 50, piecesMaxPerOrder: 5}).where(eq(storeSettings.id, "default"));
  const slug = `${tag}-bag`;
  await db.insert(products).values({slug, name: "Test bag", priceIdr: 100000, priceUsdCents: 1000, productType: "Bags"});
  const [user] = await db.insert(users).values({email: `${tag}@example.test`}).returning();
  const place = (key: string, currency: "IDR" | "USD") => createOrder(user.id, [{slug, quantity: 1}], bank, address, currency, {idempotencyKey: `${tag}-${key}`});
  const usageBefore = (await getMonthlyUsage()).PIECES;

  // Dollar orders are held for 72 hours.
  const first = await place("a", "USD");
  const held = new Date(first.order.expiresAt!).getTime() - new Date(first.order.createdAt).getTime();
  assert.equal(held, 72 * 3600 * 1000);

  // A second open order is fine; a third is refused, and replaying the first is still allowed.
  const second = await place("b", "IDR");
  assert.equal(new Date(second.order.expiresAt!).getTime() - new Date(second.order.createdAt).getTime(), 24 * 3600 * 1000);
  await assert.rejects(() => place("c", "IDR"), OpenOrdersError);
  assert.equal((await place("a", "USD")).replayed, true);
  assert.equal((await getMonthlyUsage()).PIECES - usageBefore, 2);

  // Extending adds 72 hours to the hold.
  const extended = await extendOrderHold(first.order.id);
  assert.ok(extended.ok);
  assert.equal(new Date(extended.order.expiresAt!).getTime() - new Date(first.order.expiresAt!).getTime(), 72 * 3600 * 1000);

  // The expiry job covers dollar orders, and expiring frees the slot and the account's allowance.
  await db.update(orders).set({expiresAt: new Date(Date.now() - 60_000)}).where(eq(orders.id, first.order.id));
  const swept = await expireOverdueOrders();
  assert.equal(swept.expired >= 1, true);
  assert.equal((await expireOverdueOrders()).expired, 0);
  assert.equal((await getMonthlyUsage()).PIECES - usageBefore, 1);
  const again = await place("d", "USD");
  assert.equal(again.replayed, false);

  // An expired order can no longer be extended; cancelling frees the rest.
  const late = await extendOrderHold(first.order.id);
  assert.equal(late.ok, false);
  await cancelOrder(second.order.id, "admin@example.test");
  await cancelOrder(again.order.id, "admin@example.test");
  assert.equal((await getMonthlyUsage()).PIECES - usageBefore, 0);

  // Rate limit: the fourth hit inside the window is refused.
  const key = `${tag}-rate`;
  const results = [await allowRequest(key, 3, 60_000), await allowRequest(key, 3, 60_000), await allowRequest(key, 3, 60_000), await allowRequest(key, 3, 60_000)];
  assert.deepEqual(results, [true, true, true, false]);

  await db.delete(users).where(eq(users.id, user.id));
  await db.delete(products).where(like(products.slug, `${tag}%`));
  await db.delete(rateLimitHits);
});

after(() => {
  setTimeout(() => process.exit(0), 200);
});
