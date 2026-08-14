import {and, count, eq, gte, inArray, lt, sql} from "drizzle-orm";
import {db, heroCards, orderItems, orders, products} from "@/lib/db";
import {getCustomerCount} from "@/lib/customers";

export type DateRangeKey = "today" | "7d" | "month" | "year" | "all";

// Orders in either of these statuses represent money actually received —
// "paid" covers a confirmed transfer, "fulfilled" is the same order after
// it's also shipped, still just as paid. Revenue/AOV/items-sold all count
// against this set; a pending_transfer order contributes to order *volume*
// but not to revenue, since nothing's been paid yet.
const PAID_STATUSES = ["paid", "fulfilled"] as const;

export type ResolvedRange = {
  start: Date | null;
  end: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
};

// "all" has no previous period to compare against — there's no meaningful
// "vs previous all-time," so comparisons are simply not offered for it.
export function resolveDateRange(range: DateRangeKey, now: Date = new Date()): ResolvedRange {
  const end = now;

  if (range === "all") {
    return {start: null, end, previousStart: null, previousEnd: null};
  }

  let start: Date;
  if (range === "today") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (range === "7d") {
    start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
  }

  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime());
  const previousStart = new Date(start.getTime() - durationMs);

  return {start, end, previousStart, previousEnd};
}

type PeriodMetrics = {
  totalOrders: number;
  paidOrdersCount: number;
  totalRevenue: number;
  itemsSold: number;
  averageOrderValue: number;
};

async function getPeriodMetrics(start: Date | null, end: Date): Promise<PeriodMetrics> {
  const dateFilter = start ? gte(orders.createdAt, start) : undefined;
  const endFilter = lt(orders.createdAt, end);
  const rangeFilter = dateFilter ? and(dateFilter, endFilter) : endFilter;

  const [[totalOrdersRow], [paidRow], [itemsRow]] = await Promise.all([
    db.select({value: count()}).from(orders).where(rangeFilter),
    db
      .select({value: count(), revenue: sql<number>`coalesce(sum(${orders.totalIdr}), 0)::int`})
      .from(orders)
      .where(and(rangeFilter, inArray(orders.status, PAID_STATUSES))),
    db
      .select({value: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`})
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(rangeFilter, inArray(orders.status, PAID_STATUSES)))
  ]);

  const paidOrdersCount = paidRow.value;
  const totalRevenue = paidRow.revenue;

  return {
    totalOrders: totalOrdersRow.value,
    paidOrdersCount,
    totalRevenue,
    itemsSold: itemsRow.value,
    averageOrderValue: paidOrdersCount > 0 ? Math.round(totalRevenue / paidOrdersCount) : 0
  };
}

export type DashboardStats = {
  range: DateRangeKey;
  totalRevenue: number;
  totalRevenuePrevious: number | null;
  totalOrders: number;
  totalOrdersPrevious: number | null;
  itemsSold: number;
  averageOrderValue: number;
  averageOrderValuePrevious: number | null;
  totalProducts: number;
  activeProducts: number;
  hiddenProducts: number;
  heroCardCount: number;
  ordersAwaitingTransfer: number;
  customerCount: number;
};

export async function getDashboardStats(range: DateRangeKey): Promise<DashboardStats> {
  const resolved = resolveDateRange(range);

  const [current, previous, [totalRow], [activeRow], [heroRow], [awaitingRow], customerCount] = await Promise.all([
    getPeriodMetrics(resolved.start, resolved.end),
    resolved.previousStart
      ? getPeriodMetrics(resolved.previousStart, resolved.previousEnd!)
      : Promise.resolve(null),
    db.select({value: count()}).from(products),
    db.select({value: count()}).from(products).where(eq(products.isActive, true)),
    db.select({value: count()}).from(heroCards),
    db.select({value: count()}).from(orders).where(eq(orders.status, "pending_transfer")),
    getCustomerCount()
  ]);

  const totalProducts = totalRow.value;
  const activeProducts = activeRow.value;

  return {
    range,
    totalRevenue: current.totalRevenue,
    totalRevenuePrevious: previous ? previous.totalRevenue : null,
    totalOrders: current.totalOrders,
    totalOrdersPrevious: previous ? previous.totalOrders : null,
    itemsSold: current.itemsSold,
    averageOrderValue: current.averageOrderValue,
    averageOrderValuePrevious: previous ? previous.averageOrderValue : null,
    totalProducts,
    activeProducts,
    hiddenProducts: totalProducts - activeProducts,
    heroCardCount: heroRow.value,
    ordersAwaitingTransfer: awaitingRow.value,
    customerCount
  };
}
