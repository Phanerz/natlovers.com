import {count, desc, eq, inArray, min, sql} from "drizzle-orm";
import {db, orderItems, orders, users} from "@/lib/db";

// Orders in these statuses represent money actually received — same
// convention as lib/dashboard-stats.ts's revenue math, so "Total Spent"
// here means the same thing "Total Revenue" means on the dashboard.
const PAID_STATUSES = new Set(["paid", "fulfilled"]);

// "Customer count" is every row in the users table — there's no separate
// customer/admin flag in the schema (admin access is gated by the
// ADMIN_EMAILS allowlist at the auth layer, not a DB column), so an admin
// who has signed in counts here too, same as any other real account. Used
// by lib/dashboard-stats.ts's KPI cards; the richer telemetry below is
// specific to the Customers page itself.
export async function getCustomerCount(): Promise<number> {
  const [row] = await db.select({value: count()}).from(users);
  return row.value;
}

export type CustomerTelemetry = {
  totalCustomers: number;
  newThisMonth: number;
  returningCustomers: number;
  repeatPurchaseRate: number;
};

export type CustomerListRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  firstOrderAt: string | null;
  orderCount: number;
};

export type CustomerOrderRow = {
  id: string;
  orderRef: string;
  status: string;
  totalIdr: number;
  itemCount: number;
  createdAt: string;
};

export type CustomerDetail = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  totalOrders: number;
  totalSpentIdr: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  orders: CustomerOrderRow[];
};

// Per-user order aggregates (first order date + order count), shared by the
// telemetry widgets and the list table so both read the same real numbers.
async function getOrderAggregatesByUser(): Promise<Map<string, {firstOrderAt: Date; orderCount: number}>> {
  const rows = await db
    .select({userId: orders.userId, firstOrderAt: min(orders.createdAt), orderCount: count()})
    .from(orders)
    .groupBy(orders.userId);

  const map = new Map<string, {firstOrderAt: Date; orderCount: number}>();
  for (const row of rows) {
    if (row.firstOrderAt) {
      map.set(row.userId, {firstOrderAt: new Date(row.firstOrderAt), orderCount: row.orderCount});
    }
  }
  return map;
}

// "New this month" and "customer since" both use first-order date as the
// proxy for when someone became a customer — the users table has no
// account-created timestamp at all (NextAuth's DrizzleAdapter shape doesn't
// include one), so a real order is the earliest genuine signal available.
// "Returning" counts any 2+ orders regardless of status — placing a second
// order is real repeat engagement even before it's paid.
export async function getCustomerTelemetry(): Promise<CustomerTelemetry> {
  const [[totalRow], aggregates] = await Promise.all([
    db.select({value: count()}).from(users),
    getOrderAggregatesByUser()
  ]);

  const totalCustomers = totalRow.value;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let newThisMonth = 0;
  let returningCustomers = 0;
  for (const agg of aggregates.values()) {
    if (agg.firstOrderAt >= monthStart) {
      newThisMonth += 1;
    }
    if (agg.orderCount >= 2) {
      returningCustomers += 1;
    }
  }

  const repeatPurchaseRate = totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 1000) / 10 : 0;

  return {totalCustomers, newThisMonth, returningCustomers, repeatPurchaseRate};
}

export async function getCustomerListView(): Promise<CustomerListRow[]> {
  const [customerRows, aggregates] = await Promise.all([
    db.select({id: users.id, name: users.name, email: users.email, phone: users.phone, image: users.image}).from(users),
    getOrderAggregatesByUser()
  ]);

  return customerRows.map((customer) => {
    const agg = aggregates.get(customer.id);
    return {
      ...customer,
      firstOrderAt: agg ? agg.firstOrderAt.toISOString() : null,
      orderCount: agg ? agg.orderCount : 0
    };
  });
}

export async function getCustomerDetail(userId: string): Promise<CustomerDetail | null> {
  const [customer] = await db
    .select({id: users.id, name: users.name, email: users.email, phone: users.phone, image: users.image})
    .from(users)
    .where(eq(users.id, userId));

  if (!customer) {
    return null;
  }

  const orderRows = await db
    .select({id: orders.id, orderRef: orders.orderRef, status: orders.status, totalIdr: orders.totalIdr, createdAt: orders.createdAt})
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  if (!orderRows.length) {
    return {...customer, totalOrders: 0, totalSpentIdr: 0, firstOrderAt: null, lastOrderAt: null, orders: []};
  }

  const itemCountRows = await db
    .select({orderId: orderItems.orderId, itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`})
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        orderRows.map((order) => order.id)
      )
    )
    .groupBy(orderItems.orderId);
  const itemCountByOrder = new Map(itemCountRows.map((row) => [row.orderId, row.itemCount]));

  const totalSpentIdr = orderRows
    .filter((order) => PAID_STATUSES.has(order.status))
    .reduce((sum, order) => sum + order.totalIdr, 0);

  return {
    ...customer,
    totalOrders: orderRows.length,
    totalSpentIdr,
    firstOrderAt: orderRows[orderRows.length - 1].createdAt.toISOString(),
    lastOrderAt: orderRows[0].createdAt.toISOString(),
    orders: orderRows.map((order) => ({
      id: order.id,
      orderRef: order.orderRef,
      status: order.status,
      totalIdr: order.totalIdr,
      itemCount: itemCountByOrder.get(order.id) ?? 0,
      createdAt: order.createdAt.toISOString()
    }))
  };
}
