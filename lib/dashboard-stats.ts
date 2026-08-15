import {and, count, desc, eq, gte, inArray, isNotNull, lt, sql} from "drizzle-orm";
import {db, heroCards, orderItems, orders, products, users} from "@/lib/db";
import {getCustomerCount} from "@/lib/customers";
import {countOpenCustomRequests} from "@/lib/custom-requests";

// A product only counts toward stock KPIs once it's opted into tracking
// (stock IS NOT NULL) — most of the catalogue hasn't yet, so these stay
// null (rendered as "Not tracked") until at least one product has a real
// count, rather than showing a hollow zero that reads as "fully stocked."
const LOW_STOCK_THRESHOLD = 5;

export type DateRangeKey = "today" | "7d" | "month" | "year" | "all";

// The sidebar's two nav badges used to be read off a full getDashboardStats(
// "all") call — that endpoint alone fans out ~7 queries, then the sidebar's
// concurrent invocation stacked directly on top of dashboard-home's own call
// to the same heavy endpoint on every /mimin dashboard load (two overlapping
// callers of the same expensive pipeline is exactly the pool-starvation
// scenario this file has fought before). The sidebar only ever needed these
// two indexed counts, so it gets its own 2-query path instead of paying for
// the other ~9 fields (revenue, sales series, best sellers, etc.) it never
// reads.
export async function getSidebarBadgeCounts(): Promise<{ordersAwaitingTransfer: number; openCustomRequests: number}> {
  const [[awaitingRow], openCustomRequests] = await Promise.all([
    db.select({value: count()}).from(orders).where(eq(orders.status, "pending_transfer")),
    countOpenCustomRequests()
  ]);

  return {ordersAwaitingTransfer: awaitingRow.value, openCustomRequests};
}

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
  lowStockCount: number | null;
  outOfStockCount: number | null;
  openCustomRequests: number;
};

export async function getDashboardStats(range: DateRangeKey): Promise<DashboardStats> {
  const resolved = resolveDateRange(range);

  const [current, previous, [totalRow], [activeRow], [heroRow], [awaitingRow], customerCount, [stockRow]] = await Promise.all([
    getPeriodMetrics(resolved.start, resolved.end),
    resolved.previousStart
      ? getPeriodMetrics(resolved.previousStart, resolved.previousEnd!)
      : Promise.resolve(null),
    db.select({value: count()}).from(products),
    db.select({value: count()}).from(products).where(eq(products.isActive, true)),
    db.select({value: count()}).from(heroCards),
    db.select({value: count()}).from(orders).where(eq(orders.status, "pending_transfer")),
    getCustomerCount(),
    db
      .select({
        tracked: count(),
        outOfStock: sql<number>`count(*) filter (where ${products.stock} = 0)::int`,
        lowStock: sql<number>`count(*) filter (where ${products.stock} > 0 and ${products.stock} <= ${LOW_STOCK_THRESHOLD})::int`
      })
      .from(products)
      .where(isNotNull(products.stock))
  ]);

  // Deliberately sequential, not folded into the Promise.all above. That
  // batch already fans out close to the connection pool ceiling (see the
  // max: 10 rationale in lib/db/index.ts — getPeriodMetrics and
  // getCustomerCount each run several queries of their own), and adding a
  // ninth parallel branch pushed a single dashboard load past it. Waiting
  // for a pool slot has no timeout, so the overflow did not surface as an
  // error: the endpoint simply took over 100 seconds while the sidebar and
  // every KPI tile sat on a placeholder. One extra round trip for a cheap
  // indexed count is the cheaper trade by a wide margin.
  const openCustomRequests = await countOpenCustomRequests();

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
    customerCount,
    lowStockCount: stockRow.tracked > 0 ? stockRow.lowStock : null,
    outOfStockCount: stockRow.tracked > 0 ? stockRow.outOfStock : null,
    openCustomRequests
  };
}

export type SalesSeriesPoint = {date: string; revenue: number; orders: number; itemsSold: number};

// Granularity follows the range: short windows (today/7d/month) are grouped
// by day, longer ones (year/all) by month — a year of daily points would be
// an unreadable comb of bars, and a week of monthly points would be a
// single dot.
function granularityFor(range: DateRangeKey): "day" | "month" {
  return range === "year" || range === "all" ? "month" : "day";
}

export async function getSalesSeries(range: DateRangeKey): Promise<SalesSeriesPoint[]> {
  const resolved = resolveDateRange(range);
  const granularity = granularityFor(range);
  const bucket = granularity === "day" ? sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')` : sql`to_char(${orders.createdAt}, 'YYYY-MM')`;

  const dateFilter = resolved.start ? gte(orders.createdAt, resolved.start) : undefined;
  const endFilter = lt(orders.createdAt, resolved.end);
  const rangeFilter = dateFilter ? and(dateFilter, endFilter) : endFilter;

  const rows = await db
    .select({
      date: sql<string>`${bucket}`,
      revenue: sql<number>`coalesce(sum(${orders.totalIdr}), 0)::int`,
      orders: sql<number>`count(distinct ${orders.id})::int`,
      itemsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(rangeFilter, inArray(orders.status, PAID_STATUSES)))
    .groupBy(sql`${bucket}`)
    .orderBy(sql`${bucket}`);

  return rows;
}

export type RecentOrder = {
  id: string;
  orderRef: string;
  customerName: string | null;
  customerEmail: string | null;
  totalIdr: number;
  status: string;
  createdAt: string;
};

export async function getRecentOrders(limit = 5): Promise<RecentOrder[]> {
  const rows = await db
    .select({
      id: orders.id,
      orderRef: orders.orderRef,
      customerName: users.name,
      customerEmail: users.email,
      totalIdr: orders.totalIdr,
      status: orders.status,
      createdAt: orders.createdAt
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return rows.map((row) => ({...row, createdAt: row.createdAt.toISOString()}));
}

export type BestSellingProduct = {slug: string; name: string; unitsSold: number; revenue: number};

// Deliberately all-time (not scoped to the dashboard's selected date range)
// and gated behind a minimum sample size — "best selling" out of 1-2 real
// orders isn't a ranking, it's noise dressed up as signal. Returns null
// below that floor so the UI shows an honest "not enough data" state
// instead of a fake leaderboard.
const MIN_PAID_ORDERS_FOR_BEST_SELLERS = 3;

export async function getBestSellingProducts(limit = 5): Promise<BestSellingProduct[] | null> {
  const [[paidOrderCountRow]] = await Promise.all([
    db.select({value: count()}).from(orders).where(inArray(orders.status, PAID_STATUSES))
  ]);

  if (paidOrderCountRow.value < MIN_PAID_ORDERS_FOR_BEST_SELLERS) {
    return null;
  }

  const rows = await db
    .select({
      slug: orderItems.productSlug,
      name: orderItems.productName,
      unitsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
      revenue: sql<number>`coalesce(sum(${orderItems.quantity} * ${orderItems.priceIdr}), 0)::int`
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(inArray(orders.status, PAID_STATUSES))
    .groupBy(orderItems.productSlug, orderItems.productName)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);

  return rows;
}
