import {and, desc, eq, inArray, sql} from "drizzle-orm";
import {AddressInput, createAddress, getDefaultAddress, updateAddress} from "@/lib/addresses";
import {clearCart} from "@/lib/cart";
import {db, orderItems, orders, products, users} from "@/lib/db";
import type {CartConfig} from "@/lib/cart";
import {resolveOptions, type ProductOptions} from "@/lib/product-options";
import {addonOrderLineToResolved, getOrderAddons, resolveAddonPicks, saveOrderItemAddons, type OrderAddonRow} from "@/lib/addons";
import type {AddonOrderLine} from "@/lib/addon-shared";
import {lineExtrasTotal, unitPrice} from "@/lib/pricing";
import {CurrencyCode, normalizeCurrency} from "@/lib/site";

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
  items: OrderItemView[];
};

function generateOrderRef(): string {
  return `NAT-${Date.now().toString().slice(-8)}`;
}

// Prices/names are looked up server-side from the live catalogue rather
// than trusted from the client request, so a tampered request can't submit
// an arbitrary total  -  and the result is a snapshot into order_items, so
// the order stays accurate even if the product is edited or removed later.
// The shipping address gets the same snapshot treatment: what's stored on
// the order is a frozen copy, independent of the reusable `addresses` row
// it's also saved to below (for next time's checkout to prefill from).
export async function createOrder(
  userId: string,
  requestedItems: {slug: string; quantity: number; config?: CartConfig | null}[],
  bank: {bankName: string; accountName: string; accountNumber: string},
  address: AddressInput,
  currencyInput: CurrencyCode = "IDR"
): Promise<OrderView> {
  const currency = normalizeCurrency(currencyInput);
  const slugs = requestedItems.map((item) => item.slug);
  if (!slugs.length) {
    throw new Error("No items to order.");
  }

  const catalogue = await db
    .select({
      slug: products.slug,
      name: products.name,
      priceIdr: products.priceIdr,
      priceUsdCents: products.priceUsdCents,
      customisation: products.customisation,
      hasPersonalisation: products.hasPersonalisation
    })
    .from(products)
    .where(inArray(products.slug, slugs));
  const catalogueBySlug = new Map(catalogue.map((row) => [row.slug, row]));

  const lineItems: {
    id: string;
    productSlug: string;
    productName: string;
    priceIdr: number;
    priceUsdCents: number | null;
    quantity: number;
    config: CartConfig | null;
    addons: AddonOrderLine[];
  }[] = [];

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
      if (product.hasPersonalisation && picks?.length) {
        addons = await resolveAddonPicks(picks);
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
      addons
    });
  }

  if (!lineItems.length) {
    throw new Error("None of the requested items are available.");
  }

  const totalIdr = lineItems.reduce((sum, item) => sum + item.priceIdr * item.quantity, 0);
  const totalUsdCents = currency === "USD" ? lineItems.reduce((sum, item) => sum + (item.priceUsdCents ?? 0) * item.quantity, 0) : null;
  const orderRef = generateOrderRef();

  const [order] = await db
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
      shippingCountry: address.country
    })
    .returning();

  await db.insert(orderItems).values(
    lineItems.map(({addons: _addons, ...item}) => {
      void _addons;
      return {...item, orderId: order.id};
    })
  );
  for (const item of lineItems) {
    await saveOrderItemAddons(item.id, item.addons);
  }

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

  // The order is now the record of these items  -  clear them out of the
  // active cart so the drawer doesn't show already-ordered pieces.
  await clearCart(userId);

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
    items: lineItems.map((item) => ({
      id: item.id,
      addons: item.addons,
      slug: item.productSlug,
      name: item.productName,
      priceIdr: item.priceIdr,
      priceUsdCents: item.priceUsdCents,
      quantity: item.quantity,
      config: item.config as CartConfig | null
    }))
  };
}

export async function getOrdersForUser(userId: string): Promise<OrderView[]> {
  const orderRows = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  if (!orderRows.length) {
    return [];
  }

  const itemRows = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        orderRows.map((order) => order.id)
      )
    );

  const addonsByItem = await getOrderAddons(itemRows.map((row) => row.id));
  const itemsByOrder = new Map<string, OrderItemView[]>();
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

  return orderRows.map((order) => ({
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
    items: itemsByOrder.get(order.id) ?? []
  }));
}

export type AdminOrderView = OrderView & {
  customerName: string | null;
  customerEmail: string | null;
  confirmedByEmail: string | null;
  confirmedAt: string | null;
  trackingCourier: string | null;
  trackingNumber: string | null;
};

async function attachItemsForAdmin(
  orderRows: {
    id: string;
    orderRef: string;
    status: string;
    totalIdr: number;
    currency: string;
    totalUsdCents: number | null;
    bankName: string;
    accountName: string;
    accountNumber: string;
    createdAt: Date;
    confirmedByEmail: string | null;
    confirmedAt: Date | null;
    trackingCourier: string | null;
    trackingNumber: string | null;
    customerName: string | null;
    customerEmail: string | null;
  }[]
): Promise<AdminOrderView[]> {
  if (!orderRows.length) {
    return [];
  }

  const itemRows = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        orderRows.map((order) => order.id)
      )
    );

  const addonsByItem = await getOrderAddons(itemRows.map((row) => row.id));
  const itemsByOrder = new Map<string, OrderItemView[]>();
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

  return orderRows.map((order) => ({
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
    confirmedByEmail: order.confirmedByEmail,
    confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : null,
    trackingCourier: order.trackingCourier,
    trackingNumber: order.trackingNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    items: itemsByOrder.get(order.id) ?? []
  }));
}

const adminOrderColumns = {
  id: orders.id,
  orderRef: orders.orderRef,
  status: orders.status,
  totalIdr: orders.totalIdr,
  currency: orders.currency,
  totalUsdCents: orders.totalUsdCents,
  bankName: orders.bankName,
  accountName: orders.accountName,
  accountNumber: orders.accountNumber,
  createdAt: orders.createdAt,
  confirmedByEmail: orders.confirmedByEmail,
  confirmedAt: orders.confirmedAt,
  trackingCourier: orders.trackingCourier,
  trackingNumber: orders.trackingNumber,
  customerName: users.name,
  customerEmail: users.email
} as const;

export async function getAllOrdersAdmin(): Promise<AdminOrderView[]> {
  const orderRows = await db
    .select(adminOrderColumns)
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt));

  return attachItemsForAdmin(orderRows);
}

async function getAdminOrderById(orderId: string): Promise<AdminOrderView | null> {
  const orderRows = await db
    .select(adminOrderColumns)
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, orderId));

  const [view] = await attachItemsForAdmin(orderRows);
  return view ?? null;
}

// Only touches products that opted into stock tracking (stock IS NOT NULL)
//  -  matched by the productSlug snapshotted on the order_item, since that's
// the only link back to the catalogue an order keeps. A product renamed,
// deleted, or with an untracked slug (stock still null) is silently
// skipped, floored at 0 rather than going negative for oversold items.
async function decrementStockForOrder(orderId: string): Promise<void> {
  const items = await db
    .select({productSlug: orderItems.productSlug, quantity: orderItems.quantity})
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    await db
      .update(products)
      .set({stock: sql`greatest(${products.stock} - ${item.quantity}, 0)`})
      .where(and(eq(products.slug, item.productSlug), sql`${products.stock} is not null`));
  }
}

export type MarkOrderPaidResult =
  | {ok: true; alreadyPaid: boolean; order: AdminOrderView}
  | {ok: false; error: "not_found" | "invalid_status"};

// The status check and the write happen in a single conditional UPDATE
// (WHERE id = ? AND status = 'pending_transfer') rather than a separate
// SELECT-then-UPDATE, so two concurrent "Mark as Paid" clicks on the same
// order can't both pass the check and both write a confirmation  -  only one
// UPDATE can ever match the row, the other affects zero rows and falls
// through to the idempotent "already paid" path below.
export async function markOrderPaid(orderId: string, adminEmail: string): Promise<MarkOrderPaidResult> {
  const [updated] = await db
    .update(orders)
    .set({status: "paid", confirmedByEmail: adminEmail, confirmedAt: new Date()})
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending_transfer")))
    .returning({id: orders.id});

  if (updated) {
    await decrementStockForOrder(orderId);
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
  trackingNumber: string
): Promise<SetTrackingResult> {
  const courierTrimmed = courier.trim();
  const trackingTrimmed = trackingNumber.trim();
  if (!courierTrimmed || !trackingTrimmed) {
    return {ok: false, error: "missing_fields"};
  }

  const [updated] = await db
    .update(orders)
    .set({status: "fulfilled", trackingCourier: courierTrimmed, trackingNumber: trackingTrimmed})
    .where(and(eq(orders.id, orderId), inArray(orders.status, ["paid", "fulfilled"])))
    .returning({id: orders.id});

  if (!updated) {
    const existing = await getAdminOrderById(orderId);
    return {ok: false, error: existing ? "invalid_status" : "not_found"};
  }

  const order = await getAdminOrderById(orderId);
  return {ok: true, order: order!};
}

// Permanently removes an order and its line items (order_items cascades on
// delete)  -  for clearing out test/junk orders, not something a storefront
// flow ever calls.
export async function deleteOrder(orderId: string): Promise<boolean> {
  const [deleted] = await db.delete(orders).where(eq(orders.id, orderId)).returning({id: orders.id});
  return Boolean(deleted);
}

