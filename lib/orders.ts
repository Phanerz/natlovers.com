import {desc, eq, inArray} from "drizzle-orm";
import {clearCart} from "@/lib/cart";
import {db, orderItems, orders, products} from "@/lib/db";

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
