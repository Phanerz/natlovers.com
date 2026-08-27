import {count, desc, eq, inArray, min, sql} from "drizzle-orm";
import {AddressView, getDefaultAddress} from "@/lib/addresses";
import {addresses, db, orderItems, orders, users} from "@/lib/db";

// Orders in these statuses represent money actually received  -  same
// convention as lib/dashboard-stats.ts's revenue math, so "Total Spent"
// here means the same thing "Total Revenue" means on the dashboard.
const PAID_STATUSES = new Set(["paid", "fulfilled"]);

// "Customer count" is every row in the users table  -  there's no separate
// customer/admin flag in the schema (admin access is gated by the
// ADMIN_EMAILS allowlist at the auth layer, not a DB column), so an admin
// who has signed in counts here too, same as any other real account. Used
// by lib/dashboard-stats.ts's KPI cards; the richer telemetry below is
// specific to the Customers page itself.
export async function getCustomerCount(): Promise<number> {
  const [row] = await db.select({value: count()}).from(users);
  return row.value;
}

export type CustomersByCountryRow = {country: string | null; count: number; percentage: number};

// Grouped by each customer's default saved address (a real signal now that
// checkout captures a shipping country)  -  customers with no saved address
// at all land in an "Unassigned" bucket (country: null), which always
// sorts last regardless of its count, per how this card is meant to read:
// real coverage first, the gap called out honestly at the bottom.
export async function getCustomersByCountry(): Promise<CustomersByCountryRow[]> {
  const [totalRow, countryRows] = await Promise.all([
    db.select({value: count()}).from(users),
    db
      .select({country: addresses.country, value: count()})
      .from(addresses)
      .where(eq(addresses.isDefault, true))
      .groupBy(addresses.country)
  ]);

  const totalCustomers = totalRow[0].value;
  const assigned = countryRows.reduce((sum, row) => sum + row.value, 0);
  const unassigned = totalCustomers - assigned;

  const rows: CustomersByCountryRow[] = countryRows
    .map((row) => ({country: row.country, count: row.value, percentage: totalCustomers > 0 ? Math.round((row.value / totalCustomers) * 1000) / 10 : 0}))
    .sort((a, b) => b.count - a.count);

  if (unassigned > 0) {
    rows.push({country: null, count: unassigned, percentage: totalCustomers > 0 ? Math.round((unassigned / totalCustomers) * 1000) / 10 : 0});
  }

  return rows;
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
  city: string | null;
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
  address: AddressView | null;
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
// proxy for when someone became a customer  -  the users table has no
// account-created timestamp at all (NextAuth's DrizzleAdapter shape doesn't
// include one), so a real order is the earliest genuine signal available.
// "Returning" counts any 2+ orders regardless of status  -  placing a second
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
  const [customerRows, aggregates, defaultAddressRows] = await Promise.all([
    db.select({id: users.id, name: users.name, email: users.email, phone: users.phone, image: users.image}).from(users),
    getOrderAggregatesByUser(),
    db.select({userId: addresses.userId, city: addresses.city}).from(addresses).where(eq(addresses.isDefault, true))
  ]);
  const cityByUser = new Map(defaultAddressRows.map((row) => [row.userId, row.city]));

  return customerRows.map((customer) => {
    const agg = aggregates.get(customer.id);
    return {
      ...customer,
      firstOrderAt: agg ? agg.firstOrderAt.toISOString() : null,
      orderCount: agg ? agg.orderCount : 0,
      city: cityByUser.get(customer.id) ?? null
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

  const address = await getDefaultAddress(userId);

  if (!orderRows.length) {
    return {...customer, totalOrders: 0, totalSpentIdr: 0, firstOrderAt: null, lastOrderAt: null, orders: [], address};
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
    })),
    address
  };
}
