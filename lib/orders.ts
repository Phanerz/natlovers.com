import {and, count, desc, eq, gt, inArray, isNotNull, isNull, lte, or, sql} from "drizzle-orm";
import {logFailure} from "@/lib/safe-log";
import {INVALID_QUANTITY_MESSAGE, isWholeQuantity} from "@/lib/quantity";
import {AddressInput, createAddress, getDefaultAddress, updateAddress} from "@/lib/addresses";
import {clearCart} from "@/lib/cart";
import {auditLog, db, orderItems, orders, payments, products, users} from "@/lib/db";
import type {CartConfig} from "@/lib/cart";
import {allowedAnimals, resolveOptions, type ProductOptions} from "@/lib/product-options";
import {addonOrderLineToResolved, getOrderAddons, resolveAddonPicks, saveOrderItemAddons, type OrderAddonRow} from "@/lib/addons";
import type {AddonOrderLine} from "@/lib/addon-shared";
import type {PaymentView} from "@/lib/payments/view";
import {lineExtrasTotal, unitPrice} from "@/lib/pricing";
import {CurrencyCode, normalizeCurrency} from "@/lib/site";
import {
  checkAll,
  orderExpiry,
  extendedExpiry,
  extensionVerdict,
  checkOpenOrders,
  productMaxPerOrder,
  resolveCapGroup,
  type CapGroup,
  type FulfilmentStage,
  type LimitLine,
  type LimitViolation
} from "@/lib/atelier-limits";
import {getMonthlyUsage, lockLimits, nextMonthNumber, type Executor} from "@/lib/limits";
import {sendOrderPlacedEmail, sendOwnerNotice, sendPaymentReceivedEmail, sendStageEmail, type EmailOrder} from "@/lib/order-emails";

export {orderStatusLabels} from "@/lib/order-status";

export type OrderItemView = {
  id?: string;
  // The felted animals added to this line, frozen at checkout: species, colour,
  // pose, the customer's note and the reference photo shown to them.
  addons?: (AddonOrderLine | OrderAddonRow)[];
  slug: string;
  name: string;
  priceIdr: number;
  // Set on dollar orders: what one unit cost, in cents.
  priceUsdCents: number | null;
  quantity: number;
  config: CartConfig | null;
};

export type OrderView = {
  id: string;
  orderRef: string;
  status: string;
  totalIdr: number;
  // The currency the customer chose to pay in. A dollar order is charged totalUsdCents; its
  // totalIdr is only the rupiah list price, for reference.
  currency: CurrencyCode;
  totalUsdCents: number | null;
  bankName: string;
  accountName: string;
  accountNumber: string;
  createdAt: string;
  // When an unpaid bank-transfer order is released. Null for dollar orders and for older orders.
  expiresAt: string | null;
  // Where the piece is in the atelier: received, in_atelier, finishing, shipped.
  fulfilmentStage: string;
  trackingCourier: string | null;
  trackingNumber: string | null;
  items: OrderItemView[];
};

// Raised when an order would break a limit. Carries the rule that was hit so the checkout can say
// it in the customer's own language.
// Raised when the account already has the most open unpaid orders it may have.
// A refusal caused by the request itself (nothing to order, a bad quantity). Its message is safe to
// show to the customer; no other error message ever is.
export class OrderInputError extends Error {}

export class OpenOrdersError extends Error {
  constructor() {
    super("Too many open orders");
  }
}

export class LimitError extends Error {
  violation: LimitViolation;
  nextMonth: number;
  constructor(violation: LimitViolation, nextMonth: number) {
    super(`Limit reached: ${violation.code}`);
    this.violation = violation;
    this.nextMonth = nextMonth;
  }
}

function generateOrderRef(): string {
  return `NAT-${Date.now().toString().slice(-8)}`;
}

type OrderRow = typeof orders.$inferSelect;

function toOrderView(order: OrderRow, items: OrderItemView[]): OrderView {
  return {
    id: order.id,
    orderRef: order.orderRef,
    status: order.status,
    totalIdr: order.totalIdr,
    currency: normalizeCurrency(order.currency),
    totalUsdCents: order.totalUsdCents,
    bankName: order.bankName,
    accountName: order.accountName,
    accountNumber: order.accountNumber,
    createdAt: order.createdAt.toISOString(),
    expiresAt: order.expiresAt ? order.expiresAt.toISOString() : null,
    fulfilmentStage: order.fulfilmentStage,
    trackingCourier: order.trackingCourier,
    trackingNumber: order.trackingNumber,
    items
  };
}

async function loadItems(orderIds: string[]): Promise<Map<string, OrderItemView[]>> {
  const itemsByOrder = new Map<string, OrderItemView[]>();
  if (!orderIds.length) return itemsByOrder;
  const itemRows = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
  const addonsByItem = await getOrderAddons(itemRows.map((row) => row.id));
  for (const row of itemRows) {
    const list = itemsByOrder.get(row.orderId) ?? [];
    list.push({
      id: row.id,
      addons: addonsByItem.get(row.id) ?? [],
      slug: row.productSlug,
      name: row.productName,
      priceIdr: row.priceIdr,
      priceUsdCents: row.priceUsdCents,
      quantity: row.quantity,
      config: row.config as CartConfig | null
    });
    itemsByOrder.set(row.orderId, list);
  }
  return itemsByOrder;
}

function toEmailOrder(view: OrderView, customer: {email: string | null; name?: string | null}): EmailOrder {
  return {
    orderRef: view.orderRef,
    currency: view.currency,
    totalIdr: view.totalIdr,
    totalUsdCents: view.totalUsdCents,
    bankName: view.bankName,
    accountName: view.accountName,
    accountNumber: view.accountNumber,
    expiresAt: view.expiresAt ? new Date(view.expiresAt) : null,
    trackingCourier: view.trackingCourier,
    trackingNumber: view.trackingNumber,
    customerEmail: customer.email,
    customerName: customer.name ?? null,
    itemSlugs: view.items.map((item) => item.slug),
    itemCount: view.items.reduce((sum, item) => sum + item.quantity, 0)
  };
}

// An email must never block or undo the action that caused it.
async function safely(label: string, work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    logFailure(`${label} failed`, error);
  }
}

type PricedLine = {
  id: string;
  productSlug: string;
  productName: string;
  priceIdr: number;
  priceUsdCents: number | null;
  quantity: number;
  config: CartConfig | null;
  addons: AddonOrderLine[];
  group: CapGroup;
  ownMaxPerOrder: number | null;
};

// Merges lines for the same product, so a product's own per-order limit applies to its whole
// quantity however the lines were sent.
function toLimitLines(lines: PricedLine[], limits: Parameters<typeof productMaxPerOrder>[2]): LimitLine[] {
  const bySlug = new Map<string, LimitLine>();
  for (const line of lines) {
    const existing = bySlug.get(line.productSlug);
    const addonCount = line.addons.length;
    if (existing) {
      existing.quantity += line.quantity;
      existing.addonCount = (existing.addonCount ?? 0) + addonCount;
      continue;
    }
    bySlug.set(line.productSlug, {
      slug: line.productSlug,
      quantity: line.quantity,
      group: line.group,
      maxPerOrder: productMaxPerOrder({maxPerOrder: line.ownMaxPerOrder}, line.group, limits),
      addonCount
    });
  }
  return [...bySlug.values()];
}

export type CreateOrderOptions = {
  // One key per checkout attempt. A repeated submit with the same key returns the same order.
  idempotencyKey: string;
  customerEmail?: string | null;
  customerName?: string | null;
  // "bank" (manual transfer, the default) or "online" (the hosted payment page). Decides which
  // payment instructions the order email carries.
  paymentMethod?: "bank" | "online";
};

// Prices/names are looked up server-side from the live catalogue rather
// than trusted from the client request, so a tampered request can't submit
// an arbitrary total  -  and the result is a snapshot into order_items, so
// the order stays accurate even if the product is edited or removed later.
// The shipping address gets the same snapshot treatment: what's stored on
// the order is a frozen copy, independent of the reusable `addresses` row
// it's also saved to below (for next time's checkout to prefill from).
//
// The limits are checked again here, inside one transaction that first locks the settings row, so
// two checkouts racing for the last slot are served one after the other.
export async function createOrder(
  userId: string,
  requestedItems: {slug: string; quantity: number; config?: CartConfig | null}[],
  bank: {bankName: string; accountName: string; accountNumber: string},
  address: AddressInput,
  currencyInput: CurrencyCode = "IDR",
  options: CreateOrderOptions
): Promise<{order: OrderView; replayed: boolean}> {
  const trace: {orderRef?: string} = {};
  try {
    return await placeOrder(trace, userId, requestedItems, bank, address, currencyInput, options);
  } catch (error) {
    // Expected refusals are not failures. Anything else is logged by order reference and error
    // type only: a database error can quote the name, phone and street it was given.
    if (!(error instanceof OrderInputError || error instanceof OpenOrdersError || error instanceof LimitError)) {
      logFailure("Order failed", error, trace.orderRef);
    }
    throw error;
  }
}

async function placeOrder(
  trace: {orderRef?: string},
  userId: string,
  requestedItems: {slug: string; quantity: number; config?: CartConfig | null}[],
  bank: {bankName: string; accountName: string; accountNumber: string},
  address: AddressInput,
  currencyInput: CurrencyCode,
  options: CreateOrderOptions
): Promise<{order: OrderView; replayed: boolean}> {
  const currency = normalizeCurrency(currencyInput);
  const slugs = requestedItems.map((item) => item.slug);
  if (!slugs.length) {
    throw new OrderInputError("No items to order.");
  }
  if (!requestedItems.every((item) => isWholeQuantity(item.quantity))) {
    throw new OrderInputError(INVALID_QUANTITY_MESSAGE);
  }

  const catalogue = await db
    .select({
      slug: products.slug,
      name: products.name,
      productType: products.productType,
      capGroup: products.capGroup,
      maxPerOrder: products.maxPerOrder,
      priceIdr: products.priceIdr,
      priceUsdCents: products.priceUsdCents,
      customisation: products.customisation,
      hasPersonalisation: products.hasPersonalisation
    })
    .from(products)
    .where(inArray(products.slug, slugs));
  const catalogueBySlug = new Map(catalogue.map((row) => [row.slug, row]));

  const lineItems: PricedLine[] = [];

  for (const requested of requestedItems) {
    const product = catalogueBySlug.get(requested.slug);
    if (!product || requested.quantity <= 0) {
      continue;
    }
    // Custom options (extra dolls, pets, part colours, photos): the price
    // and the readable receipt are worked out here from the product's own
    // definition, never taken from the request, so an order always charges
    // exactly what the options cost and the studio reads exactly what was
    // chosen. A product with the options off ignores any such answers.
    const definition = product.customisation as ProductOptions | null;
    let config = requested.config ?? null;
    let unitPriceIdr = product.priceIdr;
    let optionLines: {extraIdr: number}[] = [];
    let addons: AddonOrderLine[] = [];
    if (config && "kind" in config && config.kind === "productSelection") {
      if (config.custom && definition?.enabled) {
        const resolved = resolveOptions(definition, config.custom.answers);
        config = {...config, custom: {answers: config.custom.answers, lines: resolved.lines, extraIdr: resolved.extraIdr}};
        unitPriceIdr += resolved.extraIdr;
        optionLines = resolved.lines;
      } else if (config.custom) {
        const {custom: _dropped, ...rest} = config;
        void _dropped;
        config = rest;
      }
      // Felted animal add-ons: only on a product with personalisation switched
      // on, re-checked against the live admin data, and charged the flat price
      // from the settings row. Whatever the client claimed about them is dropped.
      const picks = config.addons;
      const {addons: _picks, addonLines: _lines, ...withoutAddons} = config;
      void _picks;
      void _lines;
      // Offered only when this product's custom options switch felted animals on.
      const allowed = allowedAnimals(definition);
      if (allowed && picks?.length) {
        addons = await resolveAddonPicks(picks, allowed);
        config = {...withoutAddons, addons: picks, addonLines: addons.map(addonOrderLineToResolved)};
        unitPriceIdr += addons.reduce((sum, line) => sum + line.priceIdr, 0);
      } else {
        config = withoutAddons;
      }
    }
    // A dollar order is charged the product's own fixed dollar price plus its options in dollars,
    // never a converted rupiah amount. The rupiah list price is kept alongside for reference.
    const priced = {priceIdr: product.priceIdr, priceUsdCents: product.priceUsdCents};
    const priceUsdCents =
      currency === "USD"
        ? Math.round((unitPrice(priced, "USD") + lineExtrasTotal(priced, optionLines, "USD")) * 100) +
          addons.reduce((sum, line) => sum + line.priceUsdCents, 0)
        : null;
    lineItems.push({
      id: crypto.randomUUID(),
      productSlug: product.slug,
      productName: product.name,
      priceIdr: unitPriceIdr,
      priceUsdCents,
      quantity: requested.quantity,
      config,
      addons,
      group: resolveCapGroup(product.capGroup, product.productType),
      ownMaxPerOrder: product.maxPerOrder
    });
  }

  if (!lineItems.length) {
    throw new OrderInputError("None of the requested items are available.");
  }

  const totalIdr = lineItems.reduce((sum, item) => sum + item.priceIdr * item.quantity, 0);
  const totalUsdCents = currency === "USD" ? lineItems.reduce((sum, item) => sum + (item.priceUsdCents ?? 0) * item.quantity, 0) : null;
  const orderRef = generateOrderRef();
  trace.orderRef = orderRef;
  const createdAt = new Date();
  // A bank-transfer order is held for 24 hours and a dollar order, which waits for a manual
  // invoice, for 72 hours. An admin can extend a hold. The expiry job then releases it.
  const expiresAt = orderExpiry(createdAt, currency);

  const result = await db.transaction(async (tx) => {
    // 1. Serialise every order placement behind one row lock.
    const limits = await lockLimits(tx);

    // 2. A repeated submit of the same checkout returns the order already made.
    const [existing] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.idempotencyKey, options.idempotencyKey)));
    if (existing) {
      return {replayedOrderId: existing.id as string, created: undefined};
    }

    // The account may have only a few open unpaid orders at once.
    const [openRow] = await tx
      .select({value: count()})
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.status, "pending_transfer"),
          or(isNull(orders.expiresAt), gt(orders.expiresAt, createdAt))
        )
      );
    if (!checkOpenOrders(openRow?.value ?? 0)) {
      throw new OpenOrdersError();
    }

    // 3. The limits, against what the month has used so far. Inside the lock, so the answer holds.
    const used = await getMonthlyUsage(tx, createdAt);
    const violation = checkAll(toLimitLines(lineItems, limits), limits, used);
    if (violation) {
      throw new LimitError(violation, nextMonthNumber(createdAt));
    }

    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        orderRef,
        totalIdr,
        currency,
        totalUsdCents,
        bankName: bank.bankName,
        accountName: bank.accountName,
        accountNumber: bank.accountNumber,
        shippingRecipientName: address.recipientName,
        shippingPhone: address.phone,
        shippingStreet: address.street,
        shippingCity: address.city,
        shippingProvince: address.province || null,
        shippingPostalCode: address.postalCode,
        shippingCountry: address.country,
        createdAt,
        expiresAt,
        idempotencyKey: options.idempotencyKey
      })
      .returning();

    await tx.insert(orderItems).values(
      lineItems.map(({addons: _addons, group, ownMaxPerOrder: _own, ...item}) => {
        void _addons;
        void _own;
        return {...item, orderId: order.id, capGroup: group};
      })
    );
    for (const item of lineItems) {
      await saveOrderItemAddons(item.id, item.addons, tx);
    }
    return {replayedOrderId: undefined, created: order};
  });

  if (result.replayedOrderId) {
    const view = await getOrderViewById(result.replayedOrderId);
    if (!view) throw new Error("Could not load the order.");
    return {order: view, replayed: true};
  }

  const order = result.created!;

  // Everything below is housekeeping after the order exists. None of it may fail the order.
  await safely("Saving the address", async () => {
    // Checking out also keeps the customer's saved address current  -  updates
    // their existing default in place, or saves this as their first one  -  so
    // the next checkout (and the admin's view of this customer) reflects
    // where they actually just had something shipped.
    const existingDefault = await getDefaultAddress(userId);
    if (existingDefault) {
      await updateAddress(userId, existingDefault.id, address, true);
    } else {
      await createAddress(userId, address, true);
    }
  });
  // The order is now the record of these items  -  clear them out of the
  // active cart so the drawer doesn't show already-ordered pieces.
  await safely("Clearing the bag", () => clearCart(userId));

  const view = toOrderView(
    order,
    lineItems.map((item) => ({
      id: item.id,
      addons: item.addons,
      slug: item.productSlug,
      name: item.productName,
      priceIdr: item.priceIdr,
      priceUsdCents: item.priceUsdCents,
      quantity: item.quantity,
      config: item.config
    }))
  );

  const emailOrder = {...toEmailOrder(view, {email: options.customerEmail ?? null, name: options.customerName ?? null}), payOnline: options.paymentMethod === "online"};
  await safely("Order placed email", () => sendOrderPlacedEmail(emailOrder));
  await safely("Owner notice", () => sendOwnerNotice("placed", emailOrder));

  return {order: view, replayed: false};
}

async function getOrderViewById(orderId: string): Promise<OrderView | null> {
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!row) return null;
  const items = await loadItems([row.id]);
  return toOrderView(row, items.get(row.id) ?? []);
}

export async function getOrdersForUser(userId: string): Promise<OrderView[]> {
  const orderRows = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  if (!orderRows.length) {
    return [];
  }
  const itemsByOrder = await loadItems(orderRows.map((order) => order.id));
  return orderRows.map((order) => toOrderView(order, itemsByOrder.get(order.id) ?? []));
}

// One of the customer's own orders, by its reference. Another customer's order is never returned.
export async function getOrderForUserByRef(userId: string, orderRef: string): Promise<OrderView | null> {
  const [row] = await db.select().from(orders).where(and(eq(orders.userId, userId), eq(orders.orderRef, orderRef)));
  if (!row) return null;
  const items = await loadItems([row.id]);
  return toOrderView(row, items.get(row.id) ?? []);
}

export type AdminOrderView = OrderView & {
  customerName: string | null;
  customerEmail: string | null;
  confirmedByEmail: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelledByEmail: string | null;
  payments: PaymentView[];
};

const adminOrderColumns = {
  order: orders,
  customerName: users.name,
  customerEmail: users.email
} as const;

async function attachItemsForAdmin(rows: {order: OrderRow; customerName: string | null; customerEmail: string | null}[]): Promise<AdminOrderView[]> {
  if (!rows.length) {
    return [];
  }
  const itemsByOrder = await loadItems(rows.map((row) => row.order.id));
  const paymentRows = await db
    .select()
    .from(payments)
    .where(
      inArray(
        payments.orderId,
        rows.map((row) => row.order.id)
      )
    )
    .orderBy(desc(payments.createdAt));
  const paymentsByOrder = new Map<string, PaymentView[]>();
  for (const row of paymentRows) {
    const list = paymentsByOrder.get(row.orderId) ?? [];
    list.push(paymentToView(row));
    paymentsByOrder.set(row.orderId, list);
  }
  return rows.map(({order, customerName, customerEmail}) => ({
    ...toOrderView(order, itemsByOrder.get(order.id) ?? []),
    confirmedByEmail: order.confirmedByEmail,
    confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    cancelledByEmail: order.cancelledByEmail,
    payments: paymentsByOrder.get(order.id) ?? [],
    customerName,
    customerEmail
  }));
}

export async function getAllOrdersAdmin(): Promise<AdminOrderView[]> {
  const rows = await db
    .select(adminOrderColumns)
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt));

  return attachItemsForAdmin(rows);
}

export async function getAdminOrderById(orderId: string): Promise<AdminOrderView | null> {
  const rows = await db
    .select(adminOrderColumns)
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, orderId));

  const [view] = await attachItemsForAdmin(rows);
  return view ?? null;
}

function adminToEmail(view: AdminOrderView): EmailOrder {
  return toEmailOrder(view, {email: view.customerEmail, name: view.customerName});
}

// Only touches products that opted into stock tracking (stock IS NOT NULL)
//  -  matched by the productSlug snapshotted on the order_item, since that's
// the only link back to the catalogue an order keeps. A product renamed,
// deleted, or with an untracked slug (stock still null) is silently
// skipped, floored at 0 rather than going negative for oversold items.
export async function decrementStockForOrder(orderId: string, executor: Executor = db): Promise<void> {
  const items = await executor
    .select({productSlug: orderItems.productSlug, quantity: orderItems.quantity})
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    await executor
      .update(products)
      .set({stock: sql`greatest(${products.stock} - ${item.quantity}, 0)`})
      .where(and(eq(products.slug, item.productSlug), sql`${products.stock} is not null`));
  }
}

// The payment-received email and the owner notice. Used by every way an order becomes paid (an admin
// clicking Mark as paid, the provider webhook, and the reconciliation check). Never throws.
export async function notifyOrderPaid(orderId: string): Promise<void> {
  const order = await getAdminOrderById(orderId);
  if (!order) return;
  const emailOrder = adminToEmail(order);
  await safely("Payment received email", () => sendPaymentReceivedEmail(emailOrder));
  await safely("Owner notice", () => sendOwnerNotice("paid", emailOrder));
}

export type MarkOrderPaidResult =
  | {ok: true; alreadyPaid: boolean; order: AdminOrderView}
  | {ok: false; error: "not_found" | "invalid_status"};

// The status check and the write happen in a single conditional UPDATE
// (WHERE id = ? AND status = 'pending_transfer') rather than a separate
// SELECT-then-UPDATE, so two concurrent "Mark as Paid" clicks on the same
// order can't both pass the check and both write a confirmation  -  only one
// UPDATE can ever match the row, the other affects zero rows and falls
// through to the idempotent "already paid" path below. A cancelled or expired
// order is not pending_transfer, so it is refused by the same condition.
export async function markOrderPaid(orderId: string, adminEmail: string): Promise<MarkOrderPaidResult> {
  // The update, the stock change and the audit row are one transaction: a manual "Mark as paid" can
  // never happen without leaving a record of who did it, when, and to which order.
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(orders)
      .set({status: "paid", confirmedByEmail: adminEmail, confirmedAt: new Date()})
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending_transfer")))
      .returning({id: orders.id, orderRef: orders.orderRef});
    if (!row) return null;
    await tx.insert(auditLog).values({action: "mark_paid_manually", actorEmail: adminEmail, orderId: row.id, orderRef: row.orderRef});
    await decrementStockForOrder(orderId, tx);
    return row;
  });

  if (updated) {
    await notifyOrderPaid(orderId);
    const order = await getAdminOrderById(orderId);
    return {ok: true, alreadyPaid: false, order: order!};
  }

  // The conditional update matched nothing  -  either the order doesn't
  // exist, or it does but wasn't pending_transfer (already paid, or some
  // other status). Figure out which so the caller gets the right response.
  const existing = await getAdminOrderById(orderId);
  if (!existing) {
    return {ok: false, error: "not_found"};
  }
  if (existing.status === "paid") {
    return {ok: true, alreadyPaid: true, order: existing};
  }
  return {ok: false, error: "invalid_status"};
}

export type CancelOrderResult =
  | {ok: true; alreadyCancelled: boolean; order: AdminOrderView}
  | {ok: false; error: "not_found" | "invalid_status"};

// Cancel replaces the old hard delete. Only an order still awaiting transfer can be cancelled;
// a paid order is refused. The slots it held are freed straight away.
export async function cancelOrder(orderId: string, adminEmail: string): Promise<CancelOrderResult> {
  const [updated] = await db
    .update(orders)
    .set({status: "cancelled", cancelledAt: new Date(), cancelledByEmail: adminEmail})
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending_transfer")))
    .returning({id: orders.id});

  const order = await getAdminOrderById(orderId);
  if (updated && order) return {ok: true, alreadyCancelled: false, order};
  if (!order) return {ok: false, error: "not_found"};
  if (order.status === "cancelled") return {ok: true, alreadyCancelled: true, order};
  return {ok: false, error: "invalid_status"};
}

// Marks overdue Awaiting transfer orders as expired. Safe to run twice: the second run matches
// nothing. Touches no other status.
export async function expireOverdueOrders(now: Date = new Date()): Promise<{expired: number}> {
  const rows = await db
    .update(orders)
    .set({status: "expired"})
    .where(and(eq(orders.status, "pending_transfer"), isNotNull(orders.expiresAt), lte(orders.expiresAt, now)))
    .returning({id: orders.id});
  return {expired: rows.length};
}

export type ExtendHoldResult =
  | {ok: true; order: AdminOrderView}
  | {ok: false; error: "not_found" | "invalid_status" | "expired" | "month_full"};

// Gives an unpaid order another 72 hours. Only an order still awaiting payment can be extended, and
// only while its hold is still running: once it has passed its expiry its slots were released, and
// they are not quietly taken back. Inside the same lock every checkout takes, it also confirms the
// month still has room for this order.
export async function extendOrderHold(orderId: string, now: Date = new Date()): Promise<ExtendHoldResult> {
  const outcome = await db.transaction(async (tx) => {
    const limits = await lockLimits(tx);
    const [row] = await tx
      .select({status: orders.status, expiresAt: orders.expiresAt, createdAt: orders.createdAt})
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");
    if (!row) return "not_found" as const;
    if (row.status !== "pending_transfer") return "invalid_status" as const;
    const used = await getMonthlyUsage(tx, now);
    const verdict = extensionVerdict(row, now, limits, used);
    if (verdict !== "ok") return verdict;
    await tx.update(orders).set({expiresAt: extendedExpiry(row.expiresAt, now)}).where(eq(orders.id, orderId));
    return "ok" as const;
  });
  if (outcome !== "ok") return {ok: false, error: outcome};
  const order = await getAdminOrderById(orderId);
  if (!order) return {ok: false, error: "not_found"};
  return {ok: true, order};
}

export type SetStageResult =
  | {ok: true; order: AdminOrderView}
  | {ok: false; error: "not_found" | "invalid_status" | "invalid_stage"};

// The production stage, separate from payment status. Only a paid order moves through
// received, in the atelier and finishing; shipping goes through setOrderTracking.
export async function setFulfilmentStage(orderId: string, stage: FulfilmentStage, notify: boolean): Promise<SetStageResult> {
  if (stage === "shipped") return {ok: false, error: "invalid_stage"};
  const [updated] = await db
    .update(orders)
    .set({fulfilmentStage: stage, fulfilmentStageUpdatedAt: new Date()})
    .where(and(eq(orders.id, orderId), eq(orders.status, "paid")))
    .returning({id: orders.id});

  const order = await getAdminOrderById(orderId);
  if (!order) return {ok: false, error: "not_found"};
  if (!updated) return {ok: false, error: "invalid_status"};
  if (notify) {
    await safely("Stage email", () => sendStageEmail(adminToEmail(order), stage));
  }
  return {ok: true, order};
}

export type SetTrackingResult =
  | {ok: true; order: AdminOrderView}
  | {ok: false; error: "not_found" | "invalid_status" | "missing_fields"};

// Fulfilling (attaching a courier + tracking number) only makes sense once
// payment is confirmed  -  a still-awaiting-transfer order has nothing to
// ship yet. Re-saving tracking info on an already-fulfilled order (fixing a
// typo'd tracking number) is allowed and just overwrites the fields.
export async function setOrderTracking(
  orderId: string,
  courier: string,
  trackingNumber: string,
  notify = false
): Promise<SetTrackingResult> {
  const courierTrimmed = courier.trim();
  const trackingTrimmed = trackingNumber.trim();
  if (!courierTrimmed || !trackingTrimmed) {
    return {ok: false, error: "missing_fields"};
  }

  const [updated] = await db
    .update(orders)
    .set({
      status: "fulfilled",
      fulfilmentStage: "shipped",
      fulfilmentStageUpdatedAt: new Date(),
      trackingCourier: courierTrimmed,
      trackingNumber: trackingTrimmed
    })
    .where(and(eq(orders.id, orderId), inArray(orders.status, ["paid", "fulfilled"])))
    .returning({id: orders.id});

  if (!updated) {
    const existing = await getAdminOrderById(orderId);
    return {ok: false, error: existing ? "invalid_status" : "not_found"};
  }

  const order = await getAdminOrderById(orderId);
  if (notify && order) {
    await safely("Shipped email", () => sendStageEmail(adminToEmail(order), "shipped"));
  }
  return {ok: true, order: order!};
}

function paymentToView(row: typeof payments.$inferSelect): PaymentView {
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
