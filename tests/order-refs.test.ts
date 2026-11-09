// Order references: random, quotable, and safe against a clash. The database tests run on the
// throwaway scratch Postgres:
//   npx tsx scripts/test-db.ts tests/order-refs.test.ts
import assert from "node:assert/strict";
import {test} from "node:test";
import {generateOrderRef, isOrderRefConflict} from "../lib/orders";

const url = process.env.DB_POSTGRES_URL ?? "";
const dbName = url.split("/").pop()?.split("?")[0] ?? "";
const safe = /scratch|test/i.test(dbName) && /localhost|127\.0\.0\.1/.test(url);
const needsDb = {skip: safe ? false : "needs the scratch database (npx tsx scripts/test-db.ts)"};

const address = {label: "Home", recipientName: "T", phone: "+620000000", street: "S", city: "C", province: "", postalCode: "1", country: "Indonesia"};
const noBank = {bankName: "B", accountName: "A", accountNumber: "1"};

test("reference: NAT- prefix, twelve characters, only unambiguous letters and digits", () => {
  for (let i = 0; i < 500; i += 1) {
    const ref = generateOrderRef();
    assert.match(ref, /^NAT-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
    assert.equal(ref.length, 12);
  }
});

test("reference: not derived from the clock, so a burst in one instant does not repeat", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 5000; i += 1) seen.add(generateOrderRef());
  assert.equal(seen.size, 5000);
});

test("reference: bytes that would bias the pick are skipped", () => {
  // 31 characters: bytes 0 to 247 are used, 248 to 255 are skipped. All-255 input yields nothing,
  // then good bytes follow.
  let call = 0;
  const ref = generateOrderRef((size) => {
    call += 1;
    return call === 1 ? new Uint8Array(size).fill(255) : new Uint8Array(size).map((_, i) => i);
  });
  assert.equal(call, 2);
  assert.equal(ref, "NAT-23456789");
});

test("conflict detection: the reference constraint is recognised, bare or wrapped; nothing else is", () => {
  const clash = {code: "23505", constraint_name: "orders_order_ref_unique"};
  assert.equal(isOrderRefConflict(clash), true);
  assert.equal(isOrderRefConflict(Object.assign(new Error("Failed query"), {cause: clash})), true);
  // The idempotency key index, a different constraint, other errors and non-errors are not a ref clash.
  assert.equal(isOrderRefConflict({code: "23505", constraint_name: "orders_user_idempotency_key"}), false);
  assert.equal(isOrderRefConflict({code: "40001", constraint_name: "orders_order_ref_unique"}), false);
  assert.equal(isOrderRefConflict(new Error("boom")), false);
  assert.equal(isOrderRefConflict(null), false);
  assert.equal(isOrderRefConflict("orders_order_ref_unique"), false);
});

async function world() {
  const {db, products, users, storeSettings, orders, orderItems} = await import("../lib/db");
  const {createOrder, setOrderRefGeneratorForTests} = await import("../lib/orders");
  const {eq} = await import("drizzle-orm");
  const tag = `ref-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  await db.insert(storeSettings).values({id: "default"}).onConflictDoNothing();
  await db.update(storeSettings).set({piecesMonthlyCap: 100000, piecesMaxPerOrder: 5}).where(eq(storeSettings.id, "default"));
  await db.insert(products).values({slug: `${tag}-bag`, name: "Test bag", priceIdr: 150000, priceUsdCents: 1000, productType: "Bags", stock: 10});
  let n = 0;
  async function place() {
    n += 1;
    const [user] = await db.insert(users).values({email: `${tag}-${n}@example.test`}).returning();
    return createOrder(user.id, [{slug: `${tag}-bag`, quantity: 1}], noBank, address, "IDR", {idempotencyKey: `${tag}-key-${n}`});
  }
  const itemCount = async () => (await db.select().from(orderItems).where(eq(orderItems.productSlug, `${tag}-bag`))).length;
  return {db, orders, place, itemCount, setOrderRefGeneratorForTests};
}

test("database: the reference column refuses a duplicate", needsDb, async () => {
  const w = await world();
  const {eq} = await import("drizzle-orm");
  const {order} = await w.place();
  const [row] = await w.db.select().from(w.orders).where(eq(w.orders.orderRef, order.orderRef));
  await assert.rejects(
    w.db.insert(w.orders).values({...row, id: crypto.randomUUID(), idempotencyKey: "another-key-123"}),
    (error: unknown) => isOrderRefConflict(error)
  );
});

test("database: a clash draws a new reference and the order still goes through", needsDb, async () => {
  const w = await world();
  const {order: first} = await w.place();
  const drawn: string[] = [];
  const fresh = generateOrderRef();
  // The first draw collides with the existing order, the second is free.
  w.setOrderRefGeneratorForTests(() => {
    const ref = drawn.length === 0 ? first.orderRef : fresh;
    drawn.push(ref);
    return ref;
  });
  try {
    const {order: second, replayed} = await w.place();
    assert.equal(replayed, false);
    assert.equal(drawn.length, 2);
    assert.equal(second.orderRef, fresh);
    assert.notEqual(second.orderRef, first.orderRef);
    // The failed attempt left nothing behind: exactly one line per order.
    assert.equal(await w.itemCount(), 2);
  } finally {
    w.setOrderRefGeneratorForTests(undefined);
  }
});

test("database: if every draw clashes the order fails cleanly after a few tries and leaves nothing half-made", needsDb, async () => {
  const w = await world();
  const {order: first} = await w.place();
  let draws = 0;
  w.setOrderRefGeneratorForTests(() => {
    draws += 1;
    return first.orderRef;
  });
  const original = console.error;
  console.error = () => {};
  try {
    await assert.rejects(w.place());
    assert.equal(draws, 5);
    assert.equal(await w.itemCount(), 1, "no items from the failed order");
  } finally {
    console.error = original;
    w.setOrderRefGeneratorForTests(undefined);
  }
  // And the shop works again straight away.
  const {order: next} = await w.place();
  assert.notEqual(next.orderRef, first.orderRef);
});
