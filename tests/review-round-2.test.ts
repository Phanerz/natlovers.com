// Medium findings from the second security pass. The tests that need a database run only against
// the throwaway scratch Postgres:  npx tsx scripts/test-db.ts
import assert from "node:assert/strict";
import {test} from "node:test";
import {extensionVerdict, DEFAULT_LIMITS} from "../lib/atelier-limits";
import {isWholeQuantity, MAX_LINE_QUANTITY} from "../lib/quantity";
import {errorType, logFailure} from "../lib/safe-log";
import {parseResetUrl} from "../scripts/reset-url";

const url = process.env.DB_POSTGRES_URL ?? "";
const dbName = url.split("/").pop()?.split("?")[0] ?? "";
const safe = /scratch|test/i.test(dbName) && /localhost|127\.0\.0\.1/.test(url);
const needsDb = {skip: safe ? false : "needs the scratch database (npx tsx scripts/test-db.ts)"};

const address = {label: "Home", recipientName: "T", phone: "+620000000", street: "S", city: "C", province: "", postalCode: "1", country: "Indonesia"};
const bank = {bankName: "B", accountName: "A", accountNumber: "1"};

// 1. Quantities --------------------------------------------------------------------------------
test("quantities: whole numbers only, no fractions, no huge values", () => {
  for (const good of [1, 2, 5, MAX_LINE_QUANTITY]) assert.equal(isWholeQuantity(good), true, String(good));
  for (const bad of [0, -1, 0.5, 1.5, NaN, Infinity, 1e10, "3", null, undefined, [2], {}]) assert.equal(isWholeQuantity(bad), false, String(bad));
  // The bag route also accepts 0, which removes the line.
  assert.equal(isWholeQuantity(0, {allowZero: true}), true);
  assert.equal(isWholeQuantity(-1, {allowZero: true}), false);
  assert.equal(isWholeQuantity(0.5, {allowZero: true}), false);
});

test("quantities: checkout refuses a fractional quantity before the database and creates nothing", needsDb, async () => {
  const {db, products, users, orders} = await import("../lib/db");
  const {createOrder, OrderInputError} = await import("../lib/orders");
  const {eq} = await import("drizzle-orm");
  const tag = `qty-${Date.now()}`;
  await db.insert(products).values({slug: `${tag}-bag`, name: "Test bag", priceIdr: 100000, priceUsdCents: 1000, productType: "Bags"});
  const [user] = await db.insert(users).values({email: `${tag}@example.test`}).returning();
  await assert.rejects(
    createOrder(user.id, [{slug: `${tag}-bag`, quantity: 0.5}], bank, address, "IDR", {idempotencyKey: `${tag}-key`}),
    (error) => error instanceof OrderInputError
  );
  assert.equal((await db.select().from(orders).where(eq(orders.userId, user.id))).length, 0);
});

// 2. Logs --------------------------------------------------------------------------------------
test("logs: a failure logs the order reference and error type, never the message or parameters", () => {
  const secret = "Jl. Merdeka 12, Budi Santoso, +628123456789";
  const dbError = Object.assign(new Error(`Failed query: insert into orders (...) params: ${secret}`), {
    name: "DrizzleQueryError",
    cause: {code: "22P02", message: secret}
  });
  assert.equal(errorType(dbError), "DrizzleQueryError 22P02");
  const lines: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void lines.push(args.map(String).join(" "));
  try {
    logFailure("Order failed", dbError, "NL-ABC123");
  } finally {
    console.error = original;
  }
  assert.equal(lines.length, 1);
  assert.equal(lines[0], "Order failed (order NL-ABC123): DrizzleQueryError 22P02");
  for (const part of ["Merdeka", "Budi", "+6281", "params", "insert into"]) assert.equal(lines[0].includes(part), false, part);
});

// 3. Extend hold -------------------------------------------------------------------------------
test("extend hold: refused once expired, and refused when the month no longer has room", () => {
  const now = new Date("2026-11-10T10:00:00Z");
  const placed = new Date("2026-11-09T10:00:00Z");
  const limits = {...DEFAULT_LIMITS, piecesMonthlyCap: 10};
  const live = new Date("2026-11-11T10:00:00Z");
  assert.equal(extensionVerdict({createdAt: placed, expiresAt: live}, now, limits, {PIECES: 4, ATELIER_EXTRAS: 0}), "ok");
  assert.equal(extensionVerdict({createdAt: placed, expiresAt: new Date("2026-11-10T09:59:00Z")}, now, limits, {PIECES: 4, ATELIER_EXTRAS: 0}), "expired");
  assert.equal(extensionVerdict({createdAt: placed, expiresAt: now}, now, limits, {PIECES: 4, ATELIER_EXTRAS: 0}), "expired");
  assert.equal(extensionVerdict({createdAt: placed, expiresAt: live}, now, limits, {PIECES: 11, ATELIER_EXTRAS: 0}), "month_full");
  assert.equal(extensionVerdict({createdAt: placed, expiresAt: live}, now, {...limits, extrasMonthlyCap: 3}, {PIECES: 1, ATELIER_EXTRAS: 4}), "month_full");
});

test("extend hold: the database path extends a live hold, refuses an expired one and a full month", needsDb, async () => {
  const {db, products, users, storeSettings, orders} = await import("../lib/db");
  const {createOrder, extendOrderHold} = await import("../lib/orders");
  const {eq} = await import("drizzle-orm");
  const tag = `ext-${Date.now()}`;
  await db.insert(storeSettings).values({id: "default"}).onConflictDoNothing();
  await db.update(storeSettings).set({piecesMonthlyCap: 100000, piecesMaxPerOrder: 5}).where(eq(storeSettings.id, "default"));
  await db.insert(products).values({slug: `${tag}-bag`, name: "Test bag", priceIdr: 100000, priceUsdCents: 1000, productType: "Bags"});
  const place = async (n: number) => {
    const [user] = await db.insert(users).values({email: `${tag}-${n}@example.test`}).returning();
    const {order} = await createOrder(user.id, [{slug: `${tag}-bag`, quantity: 1}], bank, address, "IDR", {idempotencyKey: `${tag}-key-${n}`});
    const [row] = await db.select().from(orders).where(eq(orders.orderRef, order.orderRef));
    return row;
  };

  const live = await place(1);
  const before = live.expiresAt!.getTime();
  const extended = await extendOrderHold(live.id);
  assert.equal(extended.ok, true);
  const [afterRow] = await db.select().from(orders).where(eq(orders.id, live.id));
  assert.ok(afterRow.expiresAt!.getTime() > before);

  const old = await place(2);
  await db.update(orders).set({expiresAt: new Date(Date.now() - 3600_000)}).where(eq(orders.id, old.id));
  assert.deepEqual(await extendOrderHold(old.id), {ok: false, error: "expired"});

  const squeezed = await place(3);
  await db.update(storeSettings).set({piecesMonthlyCap: 0}).where(eq(storeSettings.id, "default"));
  assert.deepEqual(await extendOrderHold(squeezed.id), {ok: false, error: "month_full"});
  await db.update(storeSettings).set({piecesMonthlyCap: 50}).where(eq(storeSettings.id, "default"));
});

// 4. Unsubscribed addresses --------------------------------------------------------------------
test("waiting list: an address that unsubscribed is ignored by the form and stays unsubscribed", needsDb, async () => {
  const {db, waitingList} = await import("../lib/db");
  const {joinWaitingList} = await import("../lib/waiting-list");
  const {eq} = await import("drizzle-orm");
  const email = `unsub-${Date.now()}@example.test`;
  const when = new Date("2026-10-01T00:00:00Z");
  await db.insert(waitingList).values({email, language: "id", unsubscribeToken: `tok-${Date.now()}`, unsubscribedAt: when});
  await joinWaitingList(email, "en");
  const [row] = await db.select().from(waitingList).where(eq(waitingList.email, email));
  assert.equal(row.unsubscribedAt?.getTime(), when.getTime());
  assert.equal(row.language, "id");
  assert.equal(row.notifiedAt, null);
});

// 5. Reset script address ----------------------------------------------------------------------
test("reset script: local by default, remote only with the flag, no host override in the query string", () => {
  const local = parseResetUrl("postgres://u:p@localhost:5432/natlovers_scratch", {allowRemote: false});
  assert.equal(local.ok && local.isLocal, true);
  assert.equal(parseResetUrl("postgresql://u:p@127.0.0.1/db", {allowRemote: false}).ok, true);
  assert.equal(parseResetUrl("postgres://u:p@[::1]:5432/db", {allowRemote: false}).ok, true);

  // Remote: refused without the flag, accepted with it.
  assert.equal(parseResetUrl("postgres://u:p@db.example.com:5432/postgres", {allowRemote: false}).ok, false);
  const remote = parseResetUrl("postgres://u:p@db.example.com:5432/postgres?sslmode=require", {allowRemote: true});
  assert.equal(remote.ok && !remote.isLocal && remote.host === "db.example.com", true);

  // A local-looking host with an override that points the connection elsewhere is refused, even with the flag.
  for (const sneaky of [
    "postgres://u:p@localhost/db?host=db.example.com",
    "postgres://u:p@localhost/db?HOST=db.example.com",
    "postgres://u:p@localhost/db?hostaddr=10.0.0.5",
    "postgres://u:p@localhost/db?port=6543",
    "postgres://u:p@localhost/db?service=prod",
    "postgres://u:p@localhost/db?options=-c%20search_path=x"
  ]) {
    assert.equal(parseResetUrl(sneaky, {allowRemote: true}).ok, false, sneaky);
    assert.equal(parseResetUrl(sneaky, {allowRemote: false}).ok, false, sneaky);
  }
  // Look-alike hosts, several hosts, wrong scheme, junk.
  for (const bad of ["postgres://u:p@localhost.evil.com/db", "postgres://u:p@localhost,db.example.com/db", "mysql://u:p@localhost/db", "not a url", "postgres:///db"]) {
    assert.equal(parseResetUrl(bad, {allowRemote: false}).ok, false, bad);
  }
  // The connection address is rebuilt from the checked parts.
  assert.equal(local.ok && local.connectionUrl, "postgres://u:p@localhost:5432/natlovers_scratch");
});
