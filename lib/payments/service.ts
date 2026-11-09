import {randomBytes} from "node:crypto";
import {and, desc, eq, inArray, isNull, ne, sql} from "drizzle-orm";
import {db, orders, payments, users} from "@/lib/db";
import {siteUrl} from "@/lib/email";
import {decrementStockForOrder, notifyOrderPaid} from "@/lib/orders";
import {getPaymentProvider} from "@/lib/payments";
import type {ProviderEvent} from "@/lib/payments/provider";
import type {PaymentView} from "@/lib/payments/view";
import {allowRequest} from "@/lib/rate-limit";
import {logFailure} from "@/lib/safe-log";

export type ApplyResult = {
  result: "paid" | "already_paid" | "expired" | "ignored" | "unknown_reference" | "rejected" | "paid_order_closed";
  orderRef?: string;
  reason?: string;
};

type Outcome = ApplyResult & {orderId?: string; transitioned?: boolean};

// Applies one thing the provider said about a payment. The webhook and the reconciliation check both
// come through here, so they cannot disagree. Everything that changes (the payment, the order, its
// production stage and the stock) changes in one transaction under a lock on the payment row, so a
// repeated webhook, or a webhook racing a reconciliation, can only ever apply once.
export async function applyPaymentEvent(event: ProviderEvent): Promise<ApplyResult> {
  const outcome = await db.transaction(async (tx): Promise<Outcome> => {
    let [payment] = await tx.select().from(payments).where(eq(payments.providerRef, event.providerRef)).for("update");
    if (!payment && event.externalId) {
      [payment] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.externalId, event.externalId), isNull(payments.providerRef)))
        .for("update");
    }
    if (!payment) return {result: "unknown_reference"};

    const [order] = await tx.select().from(orders).where(eq(orders.id, payment.orderId)).for("update");
    if (!order) return {result: "unknown_reference"};
    const orderRef = order.orderRef;

    // What the provider says must equal what we stored, for the payment and for the order itself.
    let mismatch: string | null = null;
    if (event.currency !== null && event.currency !== payment.currency) mismatch = "currency_mismatch";
    else if (event.amount !== null && event.amount !== payment.amount) mismatch = "amount_mismatch";
    else if (event.paidAmount !== null && event.paidAmount !== payment.amount) mismatch = "amount_mismatch";
    else if (order.currency !== payment.currency || order.totalIdr !== payment.amount) mismatch = "order_mismatch";
    else if (event.status === "paid" && (event.amount === null || event.currency === null)) mismatch = "missing_fields";
    if (mismatch) return {result: "rejected", orderRef, reason: mismatch};

    // The provider id is adopted the first time it is seen.
    if (!payment.providerRef) {
      await tx.update(payments).set({providerRef: event.providerRef}).where(eq(payments.id, payment.id));
    }
    if (event.eventId === payment.lastEventId) return {result: "ignored", orderRef, reason: "duplicate"};

    if (event.status === "paid") {
      if (payment.status === "paid") {
        await tx.update(payments).set({lastEventId: event.eventId}).where(eq(payments.id, payment.id));
        return {result: "already_paid", orderRef};
      }
      const now = new Date();
      await tx
        .update(payments)
        .set({status: "paid", paidAt: event.paidAt ?? now, lastEventId: event.eventId})
        .where(eq(payments.id, payment.id));
      if (order.status === "pending_transfer") {
        await tx
          .update(orders)
          .set({
            status: "paid",
            confirmedAt: now,
            confirmedByEmail: `${payment.provider} (automatic)`,
            fulfilmentStage: "received",
            fulfilmentStageUpdatedAt: now
          })
          .where(eq(orders.id, order.id));
        await decrementStockForOrder(order.id, tx);
        return {result: "paid", orderRef, orderId: order.id, transitioned: true};
      }
      if (order.status === "paid" || order.status === "fulfilled") return {result: "already_paid", orderRef};
      // Money arrived for an order that had already expired or been cancelled. The payment is
      // recorded, the order is left alone, and the admin sees the mismatch.
      return {result: "paid_order_closed", orderRef, orderId: order.id};
    }

    if (event.status === "expired" || event.status === "failed") {
      if (payment.status === "paid") return {result: "ignored", orderRef, reason: "already_paid"};
      await tx
        .update(payments)
        .set({status: event.status === "failed" ? "failed" : "expired", lastEventId: event.eventId})
        .where(eq(payments.id, payment.id));
      if (order.status === "pending_transfer") {
        // Another live payment for the same order keeps it open.
        const [other] = await tx
          .select({id: payments.id})
          .from(payments)
          .where(and(eq(payments.orderId, order.id), ne(payments.id, payment.id), inArray(payments.status, ["pending", "paid"])))
          .limit(1);
        if (!other) await tx.update(orders).set({status: "expired"}).where(eq(orders.id, order.id));
      }
      return {result: "expired", orderRef};
    }

    return {result: "ignored", orderRef, reason: "pending"};
  });

  if (outcome.result === "rejected" || outcome.result === "paid_order_closed") {
    // The order reference and a reason code only. Never the payload.
    console.error(`Payment ${outcome.result} (order ${outcome.orderRef}): ${outcome.reason ?? "order_not_awaiting_payment"}`);
  }
  if (outcome.transitioned && outcome.orderId) {
    await notifyOrderPaid(outcome.orderId);
  }
  return {result: outcome.result, orderRef: outcome.orderRef, reason: outcome.reason};
}

export type EnsureInvoiceResult =
  | {ok: true; url: string; reused: boolean}
  | {ok: false; error: "unavailable" | "not_found" | "not_payable" | "busy"};

// Gives the customer a live hosted payment page for an unpaid rupiah order: the one that already
// exists if it is still open, otherwise a new invoice for the exact stored total, lasting no longer
// than the order hold.
export async function ensureInvoice(orderRef: string, options: {userId?: string} = {}): Promise<EnsureInvoiceResult> {
  const provider = getPaymentProvider();
  if (!provider) return {ok: false, error: "unavailable"};

  const [row] = await db
    .select({order: orders, email: users.email})
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(options.userId ? and(eq(orders.orderRef, orderRef), eq(orders.userId, options.userId)) : eq(orders.orderRef, orderRef));
  if (!row) return {ok: false, error: "not_found"};
  const {order} = row;

  const now = new Date();
  if (order.status !== "pending_transfer" || order.currency !== "IDR" || order.totalIdr < 1) return {ok: false, error: "not_payable"};
  if (order.expiresAt && order.expiresAt.getTime() - now.getTime() < 60_000) return {ok: false, error: "not_payable"};
  const remainingMs = order.expiresAt ? order.expiresAt.getTime() - now.getTime() : 24 * 60 * 60 * 1000;
  const durationSeconds = Math.floor(remainingMs / 1000);

  // Check for a live invoice and claim the right to create one, under one lock per order, so a
  // double click cannot make two invoices for the same order.
  const claim = await db.transaction(async (tx) => {
    await tx.execute(sqlLock(order.id));
    const open = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.status, "pending")))
      .orderBy(desc(payments.createdAt));
    const live = open.find((p) => p.checkoutUrl && (!p.expiresAt || p.expiresAt.getTime() > now.getTime() + 30_000));
    if (live) return {kind: "reuse" as const, url: live.checkoutUrl!};
    if (open.some((p) => !p.checkoutUrl && now.getTime() - p.createdAt.getTime() < 30_000)) return {kind: "busy" as const};
    const externalId = `${order.orderRef}-${randomBytes(3).toString("hex")}`;
    const [created] = await tx
      .insert(payments)
      .values({
        orderId: order.id,
        provider: provider.name,
        externalId,
        amount: order.totalIdr,
        currency: "IDR",
        kind: "full",
        status: "pending",
        expiresAt: new Date(now.getTime() + durationSeconds * 1000)
      })
      .returning();
    return {kind: "create" as const, payment: created};
  });
  if (claim.kind === "reuse") return {ok: true, url: claim.url, reused: true};
  if (claim.kind === "busy") return {ok: false, error: "busy"};

  try {
    const base = `${siteUrl()}/account/orders/${encodeURIComponent(order.orderRef)}`;
    const created = await provider.createPayment({
      externalId: claim.payment.externalId,
      amount: order.totalIdr,
      currency: "IDR",
      description: `Natlovers order ${order.orderRef}`,
      customerEmail: row.email,
      durationSeconds,
      successUrl: `${base}?payment=success`,
      failureUrl: `${base}?payment=failed`
    });
    await db
      .update(payments)
      .set({providerRef: created.providerRef, checkoutUrl: created.checkoutUrl, expiresAt: created.expiresAt ?? claim.payment.expiresAt})
      .where(eq(payments.id, claim.payment.id));
    return {ok: true, url: created.checkoutUrl, reused: false};
  } catch (error) {
    await db.update(payments).set({status: "failed"}).where(eq(payments.id, claim.payment.id));
    logFailure("Could not create the payment page", error, order.orderRef);
    return {ok: false, error: "unavailable"};
  }
}

// A per-order advisory lock key, as SQL.
function sqlLock(orderId: string) {
  return sql`select pg_advisory_xact_lock(hashtext(${`invoice:${orderId}`}))`;
}

// Asks the provider about every open payment of an order and applies the answers, exactly as a
// webhook would. Safe to call as often as you like.
export async function reconcileOrder(orderId: string): Promise<{checked: number}> {
  const provider = getPaymentProvider();
  if (!provider) return {checked: 0};
  const open = await db
    .select({providerRef: payments.providerRef})
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, "pending")));
  let checked = 0;
  for (const {providerRef} of open) {
    if (!providerRef) continue;
    try {
      await applyPaymentEvent(await provider.getPaymentStatus(providerRef));
      checked += 1;
    } catch (error) {
      logFailure("Payment check failed", error);
    }
  }
  return {checked};
}

// What the customer order page runs when someone opens an unpaid order: the same check, limited to a
// few asks a minute per order so reloading the page cannot hammer the provider.
export async function reconcileForCustomer(userId: string, orderRef: string): Promise<void> {
  const [order] = await db
    .select({id: orders.id, status: orders.status})
    .from(orders)
    .where(and(eq(orders.orderRef, orderRef), eq(orders.userId, userId)));
  if (!order || order.status !== "pending_transfer") return;
  try {
    if (!(await allowRequest(`reconcile:${order.id}`, 6, 60_000))) return;
    await reconcileOrder(order.id);
  } catch (error) {
    logFailure("Payment check failed", error);
  }
}

export async function paymentsForOrder(orderId: string): Promise<PaymentView[]> {
  const rows = await db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.createdAt));
  return rows.map(toPaymentView);
}

export function toPaymentView(row: typeof payments.$inferSelect): PaymentView {
  return {
    id: row.id,
    provider: row.provider,
    providerRef: row.providerRef,
    amount: row.amount,
    currency: row.currency,
    kind: row.kind,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null
  };
}
