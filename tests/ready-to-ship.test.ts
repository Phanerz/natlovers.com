// Ready to ship versus made to order. The first group of tests is pure. The last one needs a
// SCRATCH Postgres that already has the migrations applied and WRITES to it (run it with
// npm run test:db). It refuses any database that is not local and named scratch or test.
import assert from "node:assert/strict";
import {after, test} from "node:test";
import {
  checkAll,
  checkMonthly,
  checkPerOrder,
  checkStock,
  combinedLeadTime,
  isReadyToShip,
  readyAvailable,
  resolveFulfilmentType,
  type LimitLine,
  type Limits
} from "../lib/atelier-limits";

const limits: Limits = {piecesMonthlyCap: 10, piecesMaxPerOrder: 5, extrasMaxPerOrder: 10, extrasMonthlyCap: null};
const made = (slug: string, quantity: number, maxPerOrder = 5): LimitLine => ({slug, quantity, group: "PIECES", maxPerOrder});
const ready = (slug: string, quantity: number, available: number, maxPerOrder = 5): LimitLine => ({
  slug,
  quantity,
  group: "PIECES",
  maxPerOrder,
  ready: true,
  available
});

test("every existing product is made to order until it is switched", () => {
  assert.equal(resolveFulfilmentType(undefined), "made_to_order");
  assert.equal(resolveFulfilmentType(null), "made_to_order");
  assert.equal(resolveFulfilmentType(""), "made_to_order");
  assert.equal(resolveFulfilmentType("anything else"), "made_to_order");
  assert.equal(resolveFulfilmentType("ready_to_ship"), "ready_to_ship");
  assert.equal(isReadyToShip("ready_to_ship"), true);
  assert.equal(isReadyToShip("made_to_order"), false);
  // A made-to-order line behaves exactly as before.
  assert.equal(checkAll([made("a", 3)], limits, {PIECES: 8, ATELIER_EXTRAS: 0})?.code, "month_full");
  assert.equal(checkAll([made("a", 2)], limits, {PIECES: 8, ATELIER_EXTRAS: 0}), null);
});

test("ready pieces are not counted towards the monthly cap", () => {
  const full = {PIECES: 10, ATELIER_EXTRAS: 0};
  assert.equal(checkMonthly([ready("r", 3, 9)], limits, full), null);
  assert.equal(checkAll([ready("r", 3, 9)], limits, full), null);
  // A made-to-order piece in the same bag still meets the cap, and only it is counted.
  assert.deepEqual(checkMonthly([ready("r", 3, 9), made("m", 1)], limits, full), {code: "month_full", group: "PIECES", remaining: 0});
  assert.equal(checkMonthly([ready("r", 3, 9), made("m", 1)], limits, {PIECES: 9, ATELIER_EXTRAS: 0}), null);
});

test("a ready piece cannot be ordered beyond its stock", () => {
  assert.equal(checkStock([ready("r", 2, 2)]), null);
  assert.deepEqual(checkStock([ready("r", 3, 2)]), {code: "stock", slug: "r", available: 2});
  assert.deepEqual(checkStock([ready("r", 1, 0)]), {code: "stock", slug: "r", available: 0});
  // A ready line that was never given an available figure has nothing to sell.
  assert.deepEqual(checkStock([{slug: "r", quantity: 1, group: "PIECES", maxPerOrder: 5, ready: true}]), {code: "stock", slug: "r", available: 0});
  assert.equal(checkStock([made("m", 99)]), null);
  assert.equal(readyAvailable(null), 0);
  assert.equal(readyAvailable(-2), 0);
  assert.equal(readyAvailable(4), 4);
});

test("the per-order limit still applies to ready pieces", () => {
  assert.deepEqual(checkPerOrder([ready("r", 6, 50)], limits), {code: "product_max", slug: "r", max: 5});
  assert.deepEqual(checkAll([ready("r", 4, 50, 2)], limits, {PIECES: 0, ATELIER_EXTRAS: 0}), {code: "product_max", slug: "r", max: 2});
  assert.deepEqual(checkPerOrder([ready("r", 3, 50), made("m", 3)], limits), {code: "group_max", group: "PIECES", max: 5});
});

test("add-ons on a ready piece do not use the atelier's extras allowance", () => {
  const extras: Limits = {...limits, extrasMonthlyCap: 1};
  const line: LimitLine = {...ready("r", 1, 5), addonCount: 3};
  assert.equal(checkMonthly([line], extras, {PIECES: 0, ATELIER_EXTRAS: 1}), null);
});

test("a mixed bag shows the longest lead time among its made-to-order items", () => {
  const items = [
    {fulfilmentType: "made_to_order", min: 2, max: 3},
    {fulfilmentType: "made_to_order", min: 4, max: 6},
    {fulfilmentType: "ready_to_ship", min: 12, max: 12}
  ];
  assert.deepEqual(combinedLeadTime(items), {min: 4, max: 6});
  // Ready items add nothing and have none of their own.
  assert.equal(combinedLeadTime([{fulfilmentType: "ready_to_ship", min: 5, max: 5}]), null);
  assert.equal(combinedLeadTime([{fulfilmentType: "made_to_order", min: null, max: null}]), null);
  assert.equal(combinedLeadTime([]), null);
});

// ---------------------------------------------------------------------------
// Against a scratch database.
// ---------------------------------------------------------------------------

const url = process.env.DB_POSTGRES_URL ?? "";
const dbName = url.split("/").pop()?.split("?")[0] ?? "";
const safe = /scratch|test/i.test(dbName) && /localhost|127\.0\.0\.1/.test(url);

test("ready stock in a real order: stock is enforced, the cap is not touched", {skip: safe ? false : "needs a local scratch database (DB_POSTGRES_URL)"}, async () => {
  const {db, products, users, storeSettings, orderItems} = await import("../lib/db");
  const {createOrder, LimitError} = await import("../lib/orders");
  const {getMonthlyUsage, getReadyAvailability} = await import("../lib/limits");
  const {eq, like, inArray} = await import("drizzle-orm");
  const {orders} = await import("../lib/db");

  const tag = `rs-${Date.now()}`;
  const address = {label: "Home", recipientName: "T", phone: "+620000000", street: "S", city: "C", province: "", postalCode: "1", country: "Indonesia"};
  const bank = {bankName: "B", accountName: "A", accountNumber: "1"};
  await db.insert(storeSettings).values({id: "default"}).onConflictDoNothing();
  await db.update(storeSettings).set({piecesMonthlyCap: 1000, piecesMaxPerOrder: 5}).where(eq(storeSettings.id, "default"));

  const base = {priceIdr: 100000, priceUsdCents: 1000, productType: "Bags"};
  await db.insert(products).values([
    {...base, slug: `${tag}-made`, name: "Made bag"},
    {...base, slug: `${tag}-ready`, name: "Ready bag", fulfilmentType: "ready_to_ship", stock: 3, dispatchNote: "Posted in two days"},
    {...base, slug: `${tag}-ready2`, name: "Second ready bag", fulfilmentType: "ready_to_ship", stock: 5},
    {...base, slug: `${tag}-zero`, name: "Gone", fulfilmentType: "ready_to_ship", stock: 0},
    {...base, slug: `${tag}-untracked`, name: "Uncounted", fulfilmentType: "ready_to_ship", stock: null}
  ]);

  // The new column defaults to made to order for a product that says nothing.
  const [plain] = await db.select().from(products).where(eq(products.slug, `${tag}-made`));
  assert.equal(plain.fulfilmentType, "made_to_order");
  assert.equal(plain.dispatchNote, null);

  const userIds: string[] = [];
  for (let i = 0; i < 6; i++) {
    const [user] = await db.insert(users).values({email: `${tag}-${i}@example.test`}).returning();
    userIds.push(user.id);
  }
  let key = 0;
  const place = (user: number, items: {slug: string; quantity: number}[]) =>
    createOrder(userIds[user], items, bank, address, "IDR", {idempotencyKey: `${tag}-key-${key++}`});
  const refusal = async (promise: Promise<unknown>) => {
    try {
      await promise;
    } catch (error) {
      assert.ok(error instanceof LimitError, "expected a limit refusal");
      return error.violation;
    }
    assert.fail("expected the order to be refused");
  };

  try {
    const usageBefore = await getMonthlyUsage();

    // 1. Two of three ready pieces: placed, and the monthly count does not move.
    const first = await place(0, [{slug: `${tag}-ready`, quantity: 2}]);
    assert.deepEqual(await getMonthlyUsage(), usageBefore);
    const [line] = await db.select().from(orderItems).where(eq(orderItems.orderId, first.order.id));
    assert.equal(line.fulfilmentType, "ready_to_ship");

    // 2. Two unpaid pieces are held, so one is left. Asking for two is refused, one is fine.
    assert.equal((await getReadyAvailability(db, [`${tag}-ready`])).get(`${tag}-ready`), 1);
    assert.deepEqual(await refusal(place(1, [{slug: `${tag}-ready`, quantity: 2}])), {code: "stock", slug: `${tag}-ready`, available: 1});
    await place(1, [{slug: `${tag}-ready`, quantity: 1}]);
    assert.deepEqual(await refusal(place(2, [{slug: `${tag}-ready`, quantity: 1}])), {code: "stock", slug: `${tag}-ready`, available: 0});

    // 3. Sold out and uncounted pieces cannot be bought.
    assert.deepEqual(await refusal(place(2, [{slug: `${tag}-zero`, quantity: 1}])), {code: "stock", slug: `${tag}-zero`, available: 0});
    assert.deepEqual(await refusal(place(2, [{slug: `${tag}-untracked`, quantity: 1}])), {code: "stock", slug: `${tag}-untracked`, available: 0});

    // 4. The per-order limit still applies to a ready piece, however much stock there is.
    assert.equal((await refusal(place(2, [{slug: `${tag}-ready2`, quantity: 6}]))).code, "product_max");

    // 5. A mixed bag counts only its made-to-order piece against the month.
    await place(3, [
      {slug: `${tag}-made`, quantity: 1},
      {slug: `${tag}-ready2`, quantity: 2}
    ]);
    const afterMixed = await getMonthlyUsage();
    assert.equal(afterMixed.PIECES, usageBefore.PIECES + 1);

    // 6. With the month full, made to order is refused and ready stock still sells.
    await db.update(storeSettings).set({piecesMonthlyCap: afterMixed.PIECES}).where(eq(storeSettings.id, "default"));
    assert.equal((await refusal(place(4, [{slug: `${tag}-made`, quantity: 1}]))).code, "month_full");
    await place(4, [{slug: `${tag}-ready2`, quantity: 1}]);

    // 7. Releasing an unpaid order gives its pieces back.
    await db.update(orders).set({status: "expired"}).where(eq(orders.id, first.order.id));
    assert.equal((await getReadyAvailability(db, [`${tag}-ready`])).get(`${tag}-ready`), 2);
  } finally {
    await db.update(storeSettings).set({piecesMonthlyCap: 50}).where(eq(storeSettings.id, "default"));
    await db.delete(orders).where(inArray(orders.userId, userIds));
    for (const id of userIds) await db.delete(users).where(eq(users.id, id));
    await db.delete(products).where(like(products.slug, `${tag}%`));
  }
});

after(() => {
  setTimeout(() => process.exit(0), 200);
});
