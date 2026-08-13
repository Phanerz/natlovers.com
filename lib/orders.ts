import {and, desc, eq, inArray} from "drizzle-orm";
import {clearCart} from "@/lib/cart";
import {db, orderItems, orders, products, users} from "@/lib/db";

export {orderStatusLabels} from "@/lib/order-status";

export type OrderItemView = {slug: string; name: string; priceIdr: number; quantity: number};

export type OrderView = {
  id: string;
  orderRef: string;
  status: string;
  totalIdr: number;
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
// an arbitrary total — and the result is a snapshot into order_items, so
// the order stays accurate even if the product is edited or removed later.
export async function createOrder(
  userId: string,
  requestedItems: {slug: string; quantity: number}[],
  bank: {bankName: string; accountName: string; accountNumber: string}
): Promise<OrderView> {
  const slugs = requestedItems.map((item) => item.slug);
  if (!slugs.length) {
    throw new Error("No items to order.");
  }

  const catalogue = await db
    .select({slug: products.slug, name: products.name, priceIdr: products.priceIdr})
    .from(products)
    .where(inArray(products.slug, slugs));
  const catalogueBySlug = new Map(catalogue.map((row) => [row.slug, row]));

  const lineItems = requestedItems
    .map((requested) => {
      const product = catalogueBySlug.get(requested.slug);
      if (!product || requested.quantity <= 0) {
        return null;
      }
      return {
        productSlug: product.slug,
        productName: product.name,
        priceIdr: product.priceIdr,
        quantity: requested.quantity
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (!lineItems.length) {
    throw new Error("None of the requested items are available.");
  }

  const totalIdr = lineItems.reduce((sum, item) => sum + item.priceIdr * item.quantity, 0);
  const orderRef = generateOrderRef();

  const [order] = await db
    .insert(orders)
    .values({
      userId,
      orderRef,
      totalIdr,
      bankName: bank.bankName,
      accountName: bank.accountName,
      accountNumber: bank.accountNumber
    })
    .returning();

  await db.insert(orderItems).values(lineItems.map((item) => ({...item, orderId: order.id})));

  // The order is now the record of these items — clear them out of the
  // active cart so the drawer doesn't show already-ordered pieces.
  await clearCart(userId);

  return {
    id: order.id,
    orderRef: order.orderRef,
    status: order.status,
    totalIdr: order.totalIdr,
    bankName: order.bankName,
    accountName: order.accountName,
    accountNumber: order.accountNumber,
    createdAt: order.createdAt.toISOString(),
    items: lineItems.map((item) => ({
      slug: item.productSlug,
      name: item.productName,
      priceIdr: item.priceIdr,
      quantity: item.quantity
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

  const itemsByOrder = new Map<string, OrderItemView[]>();
  for (const row of itemRows) {
    const list = itemsByOrder.get(row.orderId) ?? [];
    list.push({slug: row.productSlug, name: row.productName, priceIdr: row.priceIdr, quantity: row.quantity});
    itemsByOrder.set(row.orderId, list);
  }

  return orderRows.map((order) => ({
    id: order.id,
    orderRef: order.orderRef,
    status: order.status,
    totalIdr: order.totalIdr,
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

  const itemsByOrder = new Map<string, OrderItemView[]>();
  for (const row of itemRows) {
    const list = itemsByOrder.get(row.orderId) ?? [];
    list.push({slug: row.productSlug, name: row.productName, priceIdr: row.priceIdr, quantity: row.quantity});
    itemsByOrder.set(row.orderId, list);
  }

  return orderRows.map((order) => ({
    id: order.id,
    orderRef: order.orderRef,
    status: order.status,
    totalIdr: order.totalIdr,
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

export type MarkOrderPaidResult =
  | {ok: true; alreadyPaid: boolean; order: AdminOrderView}
  | {ok: false; error: "not_found" | "invalid_status"};

// The status check and the write happen in a single conditional UPDATE
// (WHERE id = ? AND status = 'pending_transfer') rather than a separate
// SELECT-then-UPDATE, so two concurrent "Mark as Paid" clicks on the same
// order can't both pass the check and both write a confirmation — only one
// UPDATE can ever match the row, the other affects zero rows and falls
// through to the idempotent "already paid" path below.
export async function markOrderPaid(orderId: string, adminEmail: string): Promise<MarkOrderPaidResult> {
  const [updated] = await db
    .update(orders)
    .set({status: "paid", confirmedByEmail: adminEmail, confirmedAt: new Date()})
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending_transfer")))
    .returning({id: orders.id});

  if (updated) {
    const order = await getAdminOrderById(orderId);
    return {ok: true, alreadyPaid: false, order: order!};
  }

  // The conditional update matched nothing — either the order doesn't
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
// payment is confirmed — a still-awaiting-transfer order has nothing to
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
// delete) — for clearing out test/junk orders, not something a storefront
// flow ever calls.
export async function deleteOrder(orderId: string): Promise<boolean> {
  const [deleted] = await db.delete(orders).where(eq(orders.id, orderId)).returning({id: orders.id});
  return Boolean(deleted);
}
