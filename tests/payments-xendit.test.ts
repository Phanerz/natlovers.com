// Online rupiah payments (Xendit). Everything here uses a mocked provider or a mocked fetch: no real
// Xendit account, no network, no money. Database tests run on the throwaway scratch Postgres:
//   npx tsx scripts/test-db.ts tests/payments-xendit.test.ts
import assert from "node:assert/strict";
import {after, test} from "node:test";
import {parseInvoice, XenditProvider} from "../lib/payments/xendit";
import {getXenditConfig} from "../lib/payments/config";
import {paymentRouteFor} from "../lib/payment-routes";
import {tokensMatch} from "../lib/payments/token";
import type {CreatedPayment, CreatePaymentInput, PaymentProvider, ProviderEvent} from "../lib/payments/provider";

const url = process.env.DB_POSTGRES_URL ?? "";
const dbName = url.split("/").pop()?.split("?")[0] ?? "";
const safe = /scratch|test/i.test(dbName) && /localhost|127\.0\.0\.1/.test(url);
const needsDb = {skip: safe ? false : "needs the scratch database (npx tsx scripts/test-db.ts)"};

const address = {label: "Home", recipientName: "T", phone: "+620000000", street: "S", city: "C", province: "", postalCode: "1", country: "Indonesia"};
const TOKEN = "cb-token-for-tests";
const savedEnv = {...process.env};

function useXenditEnv() {
  process.env.XENDIT_SECRET_KEY = "xnd_development_unit_test_key";
  process.env.XENDIT_CALLBACK_TOKEN = TOKEN;
  delete process.env.VERCEL_ENV;
}
after(() => {
  process.env = savedEnv;
});

// A provider that remembers what it was asked and answers from a script.
class MockProvider implements PaymentProvider {
  readonly name = "xendit";
  readonly mode = "test" as const;
  created: CreatePaymentInput[] = [];
  statusCalls: string[] = [];
  nextStatus: Partial<ProviderEvent> | null = null;
  failCreate = false;
  counter = 0;
  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    if (this.failCreate) throw new Error("provider down");
    this.created.push(input);
    this.counter += 1;
    return {providerRef: `inv-mock-${input.externalId}`, checkoutUrl: `https://checkout.example.test/${this.counter}`, expiresAt: null};
  }
  verifyWebhook(headers: Headers) {
    return tokensMatch(headers.get("x-callback-token"), TOKEN);
  }
  parseWebhook(_headers: Headers, body: unknown) {
    return parseInvoice(body, null);
  }
  async getPaymentStatus(providerRef: string): Promise<ProviderEvent> {
    this.statusCalls.push(providerRef);
    return {providerRef, externalId: null, status: "pending", amount: null, paidAmount: null, currency: null, eventId: `${providerRef}:x`, paidAt: null, ...this.nextStatus};
  }
}

// --- Pure checks ------------------------------------------------------------------------------

test("webhook token: constant-time compare accepts only the exact token", () => {
  assert.equal(tokensMatch(TOKEN, TOKEN), true);
  assert.equal(tokensMatch(TOKEN + "x", TOKEN), false);
  assert.equal(tokensMatch(TOKEN.slice(0, -1), TOKEN), false);
  assert.equal(tokensMatch("", TOKEN), false);
  assert.equal(tokensMatch(null, TOKEN), false);
  assert.equal(tokensMatch("anything", ""), false);
});

test("xendit adapter: paid, settled and expired are understood, anything unexpected is not believed", () => {
  const paid = parseInvoice({id: "i1", external_id: "NAT-1-ab", status: "PAID", amount: 150000, paid_amount: 150000, currency: "IDR", paid_at: "2026-11-10T01:00:00Z"}, null);
  assert.equal(paid?.status, "paid");
  assert.equal(paid?.amount, 150000);
  assert.equal(paid?.currency, "IDR");
  assert.equal(parseInvoice({id: "i1", status: "SETTLED"}, null)?.status, "paid");
  assert.equal(parseInvoice({id: "i1", status: "EXPIRED"}, null)?.status, "expired");
  assert.equal(parseInvoice({id: "i1", status: "PENDING"}, null)?.status, "pending");
  assert.equal(parseInvoice({id: "i1", status: "SOMETHING_NEW"}, null)?.status, "pending");
  // The event id is the webhook-id header when there is one, otherwise stable.
  assert.equal(parseInvoice({id: "i1", status: "PAID"}, "wh-9")?.eventId, "wh-9");
  assert.equal(parseInvoice({id: "i1", status: "PAID"}, null)?.eventId, "i1:paid");
  // Not a payment event.
  for (const bad of [null, "x", 5, {}, {id: "i1"}, {status: "PAID"}, {id: 7, status: "PAID"}]) assert.equal(parseInvoice(bad, null), null);
  // Strings are not numbers: an amount sent as text is treated as missing, which fails closed.
  assert.equal(parseInvoice({id: "i1", status: "PAID", amount: "150000"}, null)?.amount, null);
});

test("xendit adapter: create invoice sends the documented request and never logs the key", async () => {
  const realFetch = globalThis.fetch;
  let seen: {url: string; init: RequestInit} | null = null;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    seen = {url: String(input), init: init ?? {}};
    return new Response(JSON.stringify({id: "inv-1", invoice_url: "https://checkout.xendit.example/web/abc", expiry_date: "2026-11-11T00:00:00Z"}), {status: 200});
  }) as typeof fetch;
  try {
    const provider = new XenditProvider({secretKey: "xnd_development_abc", callbackToken: TOKEN, mode: "test"});
    const created = await provider.createPayment({
      externalId: "NAT-1-ab12",
      amount: 150000,
      currency: "IDR",
      description: "Natlovers order NAT-1",
      customerEmail: "c@example.test",
      durationSeconds: 86400,
      successUrl: "https://example.test/ok",
      failureUrl: "https://example.test/no"
    });
    assert.equal(created.providerRef, "inv-1");
    assert.equal(created.checkoutUrl, "https://checkout.xendit.example/web/abc");
    assert.equal(seen!.url, "https://api.xendit.co/v2/invoices");
    assert.equal(seen!.init.method, "POST");
    const headers = seen!.init.headers as Record<string, string>;
    assert.equal(headers.Authorization, `Basic ${Buffer.from("xnd_development_abc:").toString("base64")}`);
    const sent = JSON.parse(String(seen!.init.body));
    assert.equal(sent.external_id, "NAT-1-ab12");
    assert.equal(sent.amount, 150000);
    assert.equal(sent.currency, "IDR");
    assert.equal(sent.success_redirect_url, "https://example.test/ok");
    assert.equal(sent.failure_redirect_url, "https://example.test/no");
    assert.equal(sent.customer.email, "c@example.test");

    // A provider answer without a hosted page, or with a plain http one, is refused.
    globalThis.fetch = (async () => new Response(JSON.stringify({id: "inv-2", invoice_url: "http://insecure.example"}), {status: 200})) as typeof fetch;
    await assert.rejects(provider.createPayment({externalId: "x", amount: 1, currency: "IDR", description: "d", customerEmail: null, durationSeconds: 60, successUrl: "https://a.test", failureUrl: "https://a.test"}));
    // An error status becomes an error that carries only the status code.
    globalThis.fetch = (async () => new Response(JSON.stringify({message: "secret detail"}), {status: 400})) as typeof fetch;
    await assert.rejects(
      provider.createPayment({externalId: "x", amount: 1, currency: "IDR", description: "d", customerEmail: null, durationSeconds: 60, successUrl: "https://a.test", failureUrl: "https://a.test"}),
      (error: Error) => error.message === "Xendit create invoice failed with status 400"
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("manual fallback: without the Xendit variables, rupiah stays on bank transfer with no errors", async () => {
  const {getPaymentProvider, onlinePaymentsEnabled} = await import("../lib/payments");
  const keep = {...process.env};
  try {
    delete process.env.XENDIT_SECRET_KEY;
    delete process.env.XENDIT_CALLBACK_TOKEN;
    assert.equal(getXenditConfig(), null);
    assert.equal(getPaymentProvider(), null);
    assert.equal(onlinePaymentsEnabled(), false);
    assert.equal(paymentRouteFor("IDR", {online: onlinePaymentsEnabled()}), "idr_bank_transfer");
    // Only one of the two is not enough either.
    process.env.XENDIT_SECRET_KEY = "xnd_development_x";
    assert.equal(getXenditConfig(), null);
    delete process.env.XENDIT_SECRET_KEY;
    process.env.XENDIT_CALLBACK_TOKEN = TOKEN;
    assert.equal(getXenditConfig(), null);
    // Dollars never use it.
    useXenditEnv();
    assert.equal(paymentRouteFor("IDR", {online: onlinePaymentsEnabled()}), "idr_online");
    assert.equal(paymentRouteFor("USD", {online: onlinePaymentsEnabled()}), "usd_invoice");
  } finally {
    process.env = keep;
  }
});

test("test and live keys never mix: a live key is refused outside the production deployment", () => {
  const live = {XENDIT_SECRET_KEY: "xnd_production_abc", XENDIT_CALLBACK_TOKEN: TOKEN} as unknown as NodeJS.ProcessEnv;
  assert.equal(getXenditConfig({...live}), null);
  assert.equal(getXenditConfig({...live, VERCEL_ENV: "preview"} as NodeJS.ProcessEnv), null);
  assert.equal(getXenditConfig({...live, VERCEL_ENV: "production"} as NodeJS.ProcessEnv)?.mode, "live");
  const test = {XENDIT_SECRET_KEY: "xnd_development_abc", XENDIT_CALLBACK_TOKEN: TOKEN} as unknown as NodeJS.ProcessEnv;
  assert.equal(getXenditConfig({...test})?.mode, "test");
});

// --- Database tests ---------------------------------------------------------------------------

async function world() {
  const {db, products, users, storeSettings, orders, payments} = await import("../lib/db");
  const {createOrder} = await import("../lib/orders");
  const {eq} = await import("drizzle-orm");
  const tag = `pay-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  await db.insert(storeSettings).values({id: "default"}).onConflictDoNothing();
  await db.update(storeSettings).set({piecesMonthlyCap: 100000, piecesMaxPerOrder: 5}).where(eq(storeSettings.id, "default"));
  await db.insert(products).values({slug: `${tag}-bag`, name: "Test bag", priceIdr: 150000, priceUsdCents: 1000, productType: "Bags", stock: 10});
  let n = 0;
  // An online rupiah order with one pending payment, exactly as checkout leaves it.
  async function onlineOrder(quantity = 2) {
    n += 1;
    const [user] = await db.insert(users).values({email: `${tag}-${n}@example.test`}).returning();
    const {order} = await createOrder(user.id, [{slug: `${tag}-bag`, quantity}], {bankName: "", accountName: "", accountNumber: ""}, address, "IDR", {
      idempotencyKey: `${tag}-key-${n}`,
      paymentMethod: "online"
    });
    const [row] = await db.select().from(orders).where(eq(orders.orderRef, order.orderRef));
    const providerRef = `inv-${tag}-${n}`;
    const [payment] = await db
      .insert(payments)
      .values({
        orderId: row.id,
        provider: "xendit",
        providerRef,
        externalId: `${row.orderRef}-${n}`,
        amount: row.totalIdr,
        currency: "IDR",
        status: "pending",
        checkoutUrl: `https://checkout.example.test/${n}`,
        expiresAt: new Date(Date.now() + 3600_000)
      })
      .returning();
    return {order: row, payment, providerRef, user};
  }
  const stock = async () => (await db.select({stock: products.stock}).from(products).where(eq(products.slug, `${tag}-bag`)))[0].stock;
  const orderNow = async (id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0];
  const paymentNow = async (id: string) => (await db.select().from(payments).where(eq(payments.id, id)))[0];
  return {db, tag, onlineOrder, stock, orderNow, paymentNow};
}

async function hook(body: unknown, options: {token?: string | null; ip?: string; headers?: Record<string, string>} = {}) {
  const {POST} = await import("../app/api/webhooks/xendit/route");
  const headers: Record<string, string> = {"content-type": "application/json", "x-forwarded-for": options.ip ?? "203.0.113.7", ...(options.headers ?? {})};
  if (options.token !== null) headers["x-callback-token"] = options.token ?? TOKEN;
  const response = await POST(new Request("http://localhost/api/webhooks/xendit", {method: "POST", headers, body: JSON.stringify(body)}));
  return {status: response.status, body: (await response.json()) as Record<string, unknown>};
}

const paidBody = (ref: string, amount: number) => ({id: ref, status: "PAID", amount, paid_amount: amount, currency: "IDR", paid_at: "2026-11-10T01:00:00Z"});

test("webhook: an invalid or missing token is refused and changes nothing; the valid token is accepted", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {order, payment, providerRef} = await w.onlineOrder();
  const body = paidBody(providerRef, order.totalIdr);

  const wrong = await hook(body, {token: "not-the-token"});
  assert.equal(wrong.status, 401);
  assert.deepEqual(wrong.body, {error: "Unauthorized."});
  const missing = await hook(body, {token: null});
  assert.equal(missing.status, 401);
  assert.equal((await w.orderNow(order.id)).status, "pending_transfer");
  assert.equal((await w.paymentNow(payment.id)).status, "pending");
  assert.equal(await w.stock(), 10);

  const good = await hook(body);
  assert.equal(good.status, 200);
  assert.equal((await w.orderNow(order.id)).status, "paid");
});

test("webhook: a paid event marks payment and order paid, sets stage Received and takes stock once", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {order, payment, providerRef} = await w.onlineOrder(2);
  const result = await hook(paidBody(providerRef, order.totalIdr));
  assert.equal(result.status, 200);
  const o = await w.orderNow(order.id);
  assert.equal(o.status, "paid");
  assert.equal(o.fulfilmentStage, "received");
  assert.ok(o.confirmedAt);
  assert.equal(o.confirmedByEmail, "xendit (automatic)");
  const p = await w.paymentNow(payment.id);
  assert.equal(p.status, "paid");
  assert.ok(p.paidAt);
  assert.equal(await w.stock(), 8);
});

test("webhook: a duplicate changes nothing (same event, and a different event for the same payment)", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {order, payment, providerRef} = await w.onlineOrder(2);
  const body = paidBody(providerRef, order.totalIdr);
  assert.equal((await hook(body, {headers: {"webhook-id": "evt-1"}})).status, 200);
  const first = await w.paymentNow(payment.id);
  const firstOrder = await w.orderNow(order.id);

  assert.equal((await hook(body, {headers: {"webhook-id": "evt-1"}})).status, 200);
  assert.equal((await hook(body, {headers: {"webhook-id": "evt-2"}})).status, 200);
  assert.equal((await hook(body)).status, 200);

  const again = await w.paymentNow(payment.id);
  assert.equal(again.paidAt?.getTime(), first.paidAt?.getTime());
  assert.equal((await w.orderNow(order.id)).confirmedAt?.getTime(), firstOrder.confirmedAt?.getTime());
  assert.equal(await w.stock(), 8);
});

test("webhook: a different amount is rejected and nothing is marked paid", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {order, payment, providerRef} = await w.onlineOrder(2);
  const lines: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void lines.push(args.map(String).join(" "));
  try {
    const result = await hook(paidBody(providerRef, order.totalIdr - 1));
    assert.equal(result.status, 400);
    assert.deepEqual(result.body, {error: "Rejected."});
    // paid_amount different from the invoice amount is refused too.
    const short = await hook({...paidBody(providerRef, order.totalIdr), paid_amount: order.totalIdr - 5});
    assert.equal(short.status, 400);
    // No amount at all is refused: a paid event must say how much.
    const none = await hook({id: providerRef, status: "PAID", currency: "IDR"});
    assert.equal(none.status, 400);
  } finally {
    console.error = original;
  }
  assert.equal((await w.orderNow(order.id)).status, "pending_transfer");
  assert.equal((await w.paymentNow(payment.id)).status, "pending");
  assert.equal(await w.stock(), 10);
  // The log names the order reference and a reason code, nothing else from the payload.
  assert.ok(lines.some((line) => line.includes(`order ${order.orderRef}`) && line.includes("amount_mismatch")));
  assert.ok(lines.every((line) => !line.includes(providerRef)));
});

test("webhook: a different currency is rejected and nothing is marked paid", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {order, payment, providerRef} = await w.onlineOrder(2);
  const original = console.error;
  console.error = () => {};
  let result;
  try {
    result = await hook({...paidBody(providerRef, order.totalIdr), currency: "USD"});
  } finally {
    console.error = original;
  }
  assert.equal(result.status, 400);
  assert.equal((await w.orderNow(order.id)).status, "pending_transfer");
  assert.equal((await w.paymentNow(payment.id)).status, "pending");
  assert.equal(await w.stock(), 10);
});

test("webhook: an unknown reference is answered 200 and touches nothing", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {order, payment} = await w.onlineOrder(2);
  const result = await hook(paidBody("inv-does-not-exist", 150000));
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {ok: true});
  assert.equal((await w.orderNow(order.id)).status, "pending_transfer");
  assert.equal((await w.paymentNow(payment.id)).status, "pending");
  assert.equal(await w.stock(), 10);
});

test("webhook: an expired event marks the order Expired and frees its slots", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {getMonthlyUsage} = await import("../lib/limits");
  const {order, payment, providerRef} = await w.onlineOrder(3);
  const before = (await getMonthlyUsage(w.db)).PIECES;
  const result = await hook({id: providerRef, status: "EXPIRED", amount: order.totalIdr, currency: "IDR"});
  assert.equal(result.status, 200);
  assert.equal((await w.orderNow(order.id)).status, "expired");
  assert.equal((await w.paymentNow(payment.id)).status, "expired");
  const after = (await getMonthlyUsage(w.db)).PIECES;
  assert.equal(before - after, 3);
  assert.equal(await w.stock(), 10);
  // A late paid event for the closed order records the money but does not reopen the order.
  const late = await hook(paidBody(providerRef, order.totalIdr));
  assert.equal(late.status, 200);
  assert.equal((await w.orderNow(order.id)).status, "expired");
  assert.equal(await w.stock(), 10);
});

test("webhook: money for an order that was already closed is recorded and flagged, not hidden", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {db, orderNow, paymentNow} = w;
  const {orders} = await import("../lib/db");
  const {eq} = await import("drizzle-orm");
  const {order, payment, providerRef} = await w.onlineOrder(2);
  await db.update(orders).set({status: "cancelled"}).where(eq(orders.id, order.id));
  const original = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => void lines.push(args.map(String).join(" "));
  try {
    assert.equal((await hook(paidBody(providerRef, order.totalIdr))).status, 200);
  } finally {
    console.error = original;
  }
  assert.equal((await paymentNow(payment.id)).status, "paid");
  assert.equal((await orderNow(order.id)).status, "cancelled");
  assert.ok(lines.some((line) => line.includes(order.orderRef) && line.includes("paid_order_closed")));
});

test("reconciliation: asking the provider marks an order paid once only, however often it runs", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {setPaymentProviderForTests} = await import("../lib/payments");
  const {reconcileOrder} = await import("../lib/payments/service");
  const mock = new MockProvider();
  setPaymentProviderForTests(mock);
  try {
    const {order, payment, providerRef} = await w.onlineOrder(2);
    // Nothing paid yet: asked, nothing changes.
    mock.nextStatus = {status: "pending"};
    await reconcileOrder(order.id);
    assert.equal((await w.orderNow(order.id)).status, "pending_transfer");

    mock.nextStatus = {status: "paid", amount: order.totalIdr, paidAmount: order.totalIdr, currency: "IDR", eventId: "poll-1"};
    await reconcileOrder(order.id);
    assert.equal((await w.orderNow(order.id)).status, "paid");
    assert.equal(await w.stock(), 8);
    const paidAt = (await w.paymentNow(payment.id)).paidAt?.getTime();

    // Run it again, and let the webhook arrive as well: still once.
    await reconcileOrder(order.id);
    await reconcileOrder(order.id);
    assert.equal((await hook(paidBody(providerRef, order.totalIdr))).status, 200);
    assert.equal(await w.stock(), 8);
    assert.equal((await w.paymentNow(payment.id)).paidAt?.getTime(), paidAt);
    // A paid payment is not asked about again.
    assert.equal(mock.statusCalls.length, 2);
  } finally {
    setPaymentProviderForTests(undefined);
  }
});

test("reconciliation: a wrong amount from the provider is not believed either", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {setPaymentProviderForTests} = await import("../lib/payments");
  const {reconcileOrder} = await import("../lib/payments/service");
  const mock = new MockProvider();
  setPaymentProviderForTests(mock);
  const original = console.error;
  console.error = () => {};
  try {
    const {order} = await w.onlineOrder(2);
    mock.nextStatus = {status: "paid", amount: order.totalIdr - 100, currency: "IDR", eventId: "poll-bad"};
    await reconcileOrder(order.id);
    assert.equal((await w.orderNow(order.id)).status, "pending_transfer");
  } finally {
    console.error = original;
    setPaymentProviderForTests(undefined);
  }
});

test("pay page: the invoice is for the exact stored total, reused while open, remade once expired", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {payments} = await import("../lib/db");
  const {eq} = await import("drizzle-orm");
  const {setPaymentProviderForTests} = await import("../lib/payments");
  const {ensureInvoice} = await import("../lib/payments/service");
  const mock = new MockProvider();
  setPaymentProviderForTests(mock);
  const original = console.error;
  console.error = () => {};
  try {
    const {order, payment, user} = await w.onlineOrder(2);
    // The test key is on, so only an admin's order gets a page.
    process.env.ADMIN_EMAILS = user.email ?? "";
    // Start from an order with no live page: the one made by the helper is open, so close it.
    await w.db.update(payments).set({status: "expired"}).where(eq(payments.id, payment.id));

    const first = await ensureInvoice(order.orderRef, {userId: user.id});
    assert.equal(first.ok && !first.reused, true);
    assert.equal(mock.created.length, 1);
    assert.equal(mock.created[0].amount, order.totalIdr);
    assert.equal(mock.created[0].currency, "IDR");
    assert.ok(mock.created[0].durationSeconds > 0 && mock.created[0].durationSeconds <= 24 * 3600);
    assert.ok(mock.created[0].successUrl.includes(`/account/orders/${order.orderRef}`));

    const second = await ensureInvoice(order.orderRef, {userId: user.id});
    assert.equal(second.ok && second.reused, true);
    assert.equal(mock.created.length, 1);

    // Someone else cannot get a page for this order.
    const stranger = await ensureInvoice(order.orderRef, {userId: "someone-else"});
    assert.deepEqual(stranger, {ok: false, error: "not_found"});

    // The page expires: the next ask makes a new one.
    await w.db.update(payments).set({expiresAt: new Date(Date.now() - 1000)}).where(eq(payments.orderId, order.id));
    const third = await ensureInvoice(order.orderRef, {userId: user.id});
    assert.equal(third.ok && !third.reused, true);
    assert.equal(mock.created.length, 2);

    // If the provider is down the answer is calm and the attempt is recorded as failed.
    await w.db.update(payments).set({status: "expired"}).where(eq(payments.orderId, order.id));
    mock.failCreate = true;
    assert.deepEqual(await ensureInvoice(order.orderRef, {userId: user.id}), {ok: false, error: "unavailable"});
  } finally {
    console.error = original;
    setPaymentProviderForTests(undefined);
  }
});

test("pay page: without the Xendit variables there is no page and no error", needsDb, async () => {
  const keep = {...process.env};
  const w = await world();
  const {ensureInvoice} = await import("../lib/payments/service");
  try {
    delete process.env.XENDIT_SECRET_KEY;
    delete process.env.XENDIT_CALLBACK_TOKEN;
    const {order, user} = await w.onlineOrder(1);
    assert.deepEqual(await ensureInvoice(order.orderRef, {userId: user.id}), {ok: false, error: "unavailable"});
    assert.equal((await hook(paidBody("x", 1))).status, 503);
  } finally {
    process.env = keep;
  }
});

test("webhook: only failures are counted, so a bad sender is turned away and Xendit is not", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {order, providerRef} = await w.onlineOrder(2);
  const badIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  for (let i = 0; i < 20; i++) assert.equal((await hook({id: "x", status: "PAID"}, {token: "wrong", ip: badIp})).status, 401);
  // The 21st attempt from that address is turned away before the token is even looked at.
  assert.equal((await hook({id: "x", status: "PAID"}, {token: "wrong", ip: badIp})).status, 429);
  // A valid request from any other address is untouched.
  const good = await hook(paidBody(providerRef, order.totalIdr), {ip: "203.0.113.99"});
  assert.equal(good.status, 200);
  assert.equal((await w.orderNow(order.id)).status, "paid");
  // Valid traffic is never counted: many valid requests from one address are never blocked.
  const busyIp = "203.0.113.55";
  for (let i = 0; i < 25; i++) assert.equal((await hook({id: "unknown", status: "PENDING"}, {ip: busyIp})).status, 200);
});

test("manual Mark as paid is audited: who, when, which order, once", needsDb, async () => {
  const w = await world();
  const {auditLog} = await import("../lib/db");
  const {eq} = await import("drizzle-orm");
  const {markOrderPaid} = await import("../lib/orders");
  const {order} = await w.onlineOrder(2);
  const result = await markOrderPaid(order.id, "admin@example.test");
  assert.equal(result.ok, true);
  const rows = await w.db.select().from(auditLog).where(eq(auditLog.orderId, order.id));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].action, "mark_paid_manually");
  assert.equal(rows[0].actorEmail, "admin@example.test");
  assert.equal(rows[0].orderRef, order.orderRef);
  assert.ok(rows[0].createdAt);
  assert.equal(await w.stock(), 8);
  // Clicking again changes nothing and writes nothing.
  await markOrderPaid(order.id, "admin@example.test");
  assert.equal((await w.db.select().from(auditLog).where(eq(auditLog.orderId, order.id))).length, 1);
  assert.equal(await w.stock(), 8);
});

// --- Test key is for admins only --------------------------------------------------------------

test("test key: only a signed-in admin gets Xendit, everyone else gets the bank transfer flow", async () => {
  const {getPaymentProviderFor, onlinePaymentsEnabledFor, setPaymentProviderForTests} = await import("../lib/payments");
  const keep = {...process.env};
  try {
    process.env.ADMIN_EMAILS = "Owner@Example.test, second@example.test";
    const testProvider = new MockProvider();
    setPaymentProviderForTests(testProvider);
    // Admins, whatever the letter case.
    assert.equal(getPaymentProviderFor("owner@example.test"), testProvider);
    assert.equal(getPaymentProviderFor("SECOND@example.test"), testProvider);
    // Customers, signed-out visitors and empty emails never get test money.
    assert.equal(getPaymentProviderFor("customer@example.test"), null);
    assert.equal(getPaymentProviderFor(null), null);
    assert.equal(getPaymentProviderFor(undefined), null);
    assert.equal(getPaymentProviderFor(""), null);
    assert.equal(paymentRouteFor("IDR", {online: onlinePaymentsEnabledFor("customer@example.test")}), "idr_bank_transfer");
    assert.equal(paymentRouteFor("IDR", {online: onlinePaymentsEnabledFor("owner@example.test")}), "idr_online");
    // An empty allowlist means nobody is an admin.
    process.env.ADMIN_EMAILS = "";
    assert.equal(getPaymentProviderFor("owner@example.test"), null);

    // A live key applies to everyone.
    const live = new MockProvider();
    (live as {mode: "test" | "live"}).mode = "live";
    setPaymentProviderForTests(live);
    assert.equal(getPaymentProviderFor("customer@example.test"), live);
    assert.equal(getPaymentProviderFor(null), live);
    // Not set up at all: nobody.
    setPaymentProviderForTests(null);
    assert.equal(getPaymentProviderFor("owner@example.test"), null);
  } finally {
    setPaymentProviderForTests(undefined);
    process.env = keep;
  }
});

test("test key: a customer order cannot get a payment page, an admin order can, a live key serves both", needsDb, async () => {
  useXenditEnv();
  const w = await world();
  const {payments} = await import("../lib/db");
  const {eq} = await import("drizzle-orm");
  const {setPaymentProviderForTests} = await import("../lib/payments");
  const {ensureInvoice} = await import("../lib/payments/service");
  const mock = new MockProvider();
  setPaymentProviderForTests(mock);
  try {
    const customer = await w.onlineOrder(1);
    const admin = await w.onlineOrder(1);
    process.env.ADMIN_EMAILS = admin.user.email ?? "";
    await w.db.update(payments).set({status: "expired"}).where(eq(payments.orderId, customer.order.id));
    await w.db.update(payments).set({status: "expired"}).where(eq(payments.orderId, admin.order.id));

    assert.deepEqual(await ensureInvoice(customer.order.orderRef, {userId: customer.user.id}), {ok: false, error: "unavailable"});
    assert.equal(mock.created.length, 0, "the provider was never asked");
    assert.equal((await w.db.select().from(payments).where(eq(payments.orderId, customer.order.id))).length, 1, "no new payment row");

    const ok = await ensureInvoice(admin.order.orderRef, {userId: admin.user.id});
    assert.equal(ok.ok, true);
    assert.equal(mock.created.length, 1);

    // With a live key the same customer is served.
    (mock as {mode: "test" | "live"}).mode = "live";
    const served = await ensureInvoice(customer.order.orderRef, {userId: customer.user.id});
    assert.equal(served.ok, true);
    assert.equal(mock.created.length, 2);
  } finally {
    setPaymentProviderForTests(undefined);
    delete process.env.ADMIN_EMAILS;
  }
});
