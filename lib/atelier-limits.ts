// Pure rules for the atelier's limits. No database and no browser APIs, so the same code runs in
// the order transaction, in the bag routes and in the tests.

export const CAP_GROUPS = ["PIECES", "ATELIER_EXTRAS"] as const;
export type CapGroup = (typeof CAP_GROUPS)[number];

// How a product reaches the customer. Made to order is the atelier's normal way and counts towards
// the monthly cap. Ready to ship is finished stock: it is limited by its stock quantity instead, is
// not counted towards the cap and has no lead time.
export const FULFILMENT_TYPES = ["made_to_order", "ready_to_ship"] as const;
export type FulfilmentType = (typeof FULFILMENT_TYPES)[number];

// Anything that is not exactly "ready_to_ship" is made to order, so a missing value changes nothing.
export function resolveFulfilmentType(value: string | null | undefined): FulfilmentType {
  return value === "ready_to_ship" ? "ready_to_ship" : "made_to_order";
}

export function isReadyToShip(value: string | null | undefined): boolean {
  return value === "ready_to_ship";
}

// A ready-to-ship product with no stock number, or none left, cannot be bought. An untracked ready
// product is treated as having nothing, because a piece we do not count cannot be promised.
export function readyAvailable(stock: number | null | undefined): number {
  return stock != null && stock > 0 ? Math.floor(stock) : 0;
}

export const DISPATCH_NOTE_MAX = 160;

export const DEFAULT_LIMITS = {
  piecesMonthlyCap: 50,
  piecesMaxPerOrder: 5,
  extrasMaxPerOrder: 10,
  // The extras group has no monthly cap unless one is set in admin.
  extrasMonthlyCap: null as number | null
};

export type Limits = {
  piecesMonthlyCap: number;
  piecesMaxPerOrder: number;
  extrasMaxPerOrder: number;
  extrasMonthlyCap: number | null;
};

// Bags and apparel are pieces; dolls and accessories are atelier extras. A product can override
// this with its own cap group in admin.
export function defaultCapGroupForType(productType: string | null | undefined): CapGroup {
  return productType === "Dolls" || productType === "Accessories" ? "ATELIER_EXTRAS" : "PIECES";
}

export function resolveCapGroup(capGroup: string | null | undefined, productType: string | null | undefined): CapGroup {
  return capGroup === "PIECES" || capGroup === "ATELIER_EXTRAS" ? capGroup : defaultCapGroupForType(productType);
}

export function groupMaxPerOrder(group: CapGroup, limits: Limits): number {
  return group === "PIECES" ? limits.piecesMaxPerOrder : limits.extrasMaxPerOrder;
}

// A product's own limit, defaulting to its group's.
export function productMaxPerOrder(product: {maxPerOrder: number | null | undefined}, group: CapGroup, limits: Limits): number {
  const own = product.maxPerOrder;
  return own != null && own > 0 ? own : groupMaxPerOrder(group, limits);
}

export type LimitLine = {
  slug: string;
  quantity: number;
  group: CapGroup;
  maxPerOrder: number;
  // Felted add-ons carried by one unit of this line. They count towards the extras total.
  addonCount?: number;
  // A ready-to-ship line is held to `available` (its stock, less what unpaid orders already hold)
  // and is left out of the monthly count.
  ready?: boolean;
  available?: number;
};

export type LimitViolation =
  | {code: "product_max"; slug: string; max: number}
  | {code: "group_max"; group: CapGroup; max: number}
  | {code: "stock"; slug: string; available: number}
  | {code: "month_full"; group: CapGroup; remaining: number};

// Both per-order limits apply: the total quantity in a group, and each product on its own.
export function checkPerOrder(lines: LimitLine[], limits: Limits): LimitViolation | null {
  for (const line of lines) {
    if (line.quantity > line.maxPerOrder) return {code: "product_max", slug: line.slug, max: line.maxPerOrder};
  }
  for (const group of CAP_GROUPS) {
    // The per-order limit is about the size of one order, so ready pieces count here.
    const total = groupQuantity(lines, group, true);
    const max = groupMaxPerOrder(group, limits);
    if (total > max) return {code: "group_max", group, max};
  }
  return null;
}

// What a group asks of the atelier. Ready-to-ship lines are finished already, so they are left out
// unless `includeReady` is set (the per-order check). Their add-ons are left out with them.
export function groupQuantity(lines: LimitLine[], group: CapGroup, includeReady = false): number {
  return lines.reduce((sum, line) => {
    if (line.ready && !includeReady) return sum;
    if (line.group === group) return sum + line.quantity;
    // Add-ons ride on a piece but belong to the extras group.
    if (group === "ATELIER_EXTRAS") return sum + (line.addonCount ?? 0) * line.quantity;
    return sum;
  }, 0);
}

// A ready-to-ship line may not ask for more than is in stock.
export function checkStock(lines: LimitLine[]): LimitViolation | null {
  for (const line of lines) {
    if (!line.ready) continue;
    const available = line.available ?? 0;
    if (line.quantity > available) return {code: "stock", slug: line.slug, available};
  }
  return null;
}

// Checks the monthly limit for a group against what the month has already used. Only the pieces
// group has a cap by default; extras only when one has been set.
export function checkMonthly(
  lines: LimitLine[],
  limits: Limits,
  used: {PIECES: number; ATELIER_EXTRAS: number}
): LimitViolation | null {
  const caps: Record<CapGroup, number | null> = {PIECES: limits.piecesMonthlyCap, ATELIER_EXTRAS: limits.extrasMonthlyCap};
  for (const group of CAP_GROUPS) {
    const cap = caps[group];
    if (cap == null) continue;
    const wanted = groupQuantity(lines, group);
    if (wanted <= 0) continue;
    const remaining = Math.max(0, cap - used[group]);
    if (wanted > remaining) return {code: "month_full", group, remaining};
  }
  return null;
}

export function checkAll(lines: LimitLine[], limits: Limits, used: {PIECES: number; ATELIER_EXTRAS: number}): LimitViolation | null {
  return checkPerOrder(lines, limits) ?? checkStock(lines) ?? checkMonthly(lines, limits, used);
}

// ---------------------------------------------------------------------------
// Calendar months in Asia/Jakarta (UTC+7, no daylight saving).
// ---------------------------------------------------------------------------

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export type MonthKey = {year: number; month: number}; // month is 1 to 12

export function jakartaMonth(at: Date): MonthKey {
  const shifted = new Date(at.getTime() + JAKARTA_OFFSET_MS);
  return {year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1};
}

export function jakartaDayOfMonth(at: Date): number {
  return new Date(at.getTime() + JAKARTA_OFFSET_MS).getUTCDate();
}

// The instants (as real UTC times) at which a Jakarta calendar month starts and ends.
export function jakartaMonthRange(key: MonthKey): {start: Date; end: Date} {
  const start = new Date(Date.UTC(key.year, key.month - 1, 1) - JAKARTA_OFFSET_MS);
  const end = new Date(Date.UTC(key.year, key.month, 1) - JAKARTA_OFFSET_MS);
  return {start, end};
}

export function nextMonth(key: MonthKey): MonthKey {
  return key.month === 12 ? {year: key.year + 1, month: 1} : {year: key.year, month: key.month + 1};
}

export const MONTH_NAMES = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  id: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
} as const;

export function monthName(month: number, language: "en" | "id"): string {
  return MONTH_NAMES[language][month - 1] ?? "";
}

// The 24-hour hold on a bank-transfer order.
export const ORDER_HOLD_MS = 24 * 60 * 60 * 1000;
// A dollar order waits for a manual invoice, so it is held for longer: 72 hours, unless an admin
// extends it.
export const USD_ORDER_HOLD_MS = 72 * 60 * 60 * 1000;

export function orderExpiry(createdAt: Date, currency: "IDR" | "USD" = "IDR"): Date {
  return new Date(createdAt.getTime() + (currency === "USD" ? USD_ORDER_HOLD_MS : ORDER_HOLD_MS));
}

// One click in admin gives an unpaid order another 72 hours, counted from now or from its current
// expiry, whichever is later.
export function extendedExpiry(current: Date | null, now: Date): Date {
  const base = current && current.getTime() > now.getTime() ? current.getTime() : now.getTime();
  return new Date(base + USD_ORDER_HOLD_MS);
}

// Each account may have at most this many open unpaid orders at once.
export const MAX_OPEN_UNPAID_ORDERS = 2;

export function checkOpenOrders(openCount: number): boolean {
  return openCount < MAX_OPEN_UNPAID_ORDERS;
}

// Statuses that hold a slot in the month: an unpaid order only while it has not expired.
export function holdsSlot(order: {status: string; expiresAt: Date | null}, now: Date): boolean {
  if (order.status === "paid" || order.status === "fulfilled") return true;
  if (order.status === "pending_transfer") return order.expiresAt == null || order.expiresAt.getTime() > now.getTime();
  return false;
}

// ---------------------------------------------------------------------------
// Fulfilment stages (separate from payment status).
// ---------------------------------------------------------------------------

export const FULFILMENT_STAGES = ["received", "in_atelier", "finishing", "shipped"] as const;
export type FulfilmentStage = (typeof FULFILMENT_STAGES)[number];

export function isFulfilmentStage(value: unknown): value is FulfilmentStage {
  return typeof value === "string" && (FULFILMENT_STAGES as readonly string[]).includes(value);
}

export function stageIndex(stage: string): number {
  const index = FULFILMENT_STAGES.indexOf(stage as FulfilmentStage);
  return index < 0 ? 0 : index;
}

// Lead time shown only when a range is set. Returns null when nothing should be shown.
export function leadTimeRange(min: number | null | undefined, max: number | null | undefined): {min: number; max: number} | null {
  const low = min != null && min > 0 ? min : null;
  const high = max != null && max > 0 ? max : null;
  if (low == null && high == null) return null;
  const a = low ?? high!;
  const b = high ?? low!;
  return a <= b ? {min: a, max: b} : {min: b, max: a};
}

// The lead time of a bag or an order: the longest among its made-to-order items, because everything
// ships together. Ready-to-ship items have none and never shorten or lengthen it.
export function combinedLeadTime(
  items: {fulfilmentType?: string | null; min: number | null | undefined; max: number | null | undefined}[]
): {min: number; max: number} | null {
  let min = 0;
  let max = 0;
  let any = false;
  for (const item of items) {
    if (isReadyToShip(item.fulfilmentType)) continue;
    const range = leadTimeRange(item.min, item.max);
    if (!range) continue;
    any = true;
    min = Math.max(min, range.min);
    max = Math.max(max, range.max);
  }
  return any ? {min, max} : null;
}

export type ExtendVerdict = "ok" | "expired" | "month_full";

// Whether an admin may give an unpaid order another 72 hours. Not once its hold has run out (its
// slots were already released), and not if the month it was placed in no longer has room for it.
// `used` is the month's usage as it stands now, which includes this order while its hold runs.
export function extensionVerdict(
  order: {createdAt: Date; expiresAt: Date | null},
  now: Date,
  limits: Limits,
  used: {PIECES: number; ATELIER_EXTRAS: number}
): ExtendVerdict {
  if (order.expiresAt != null && order.expiresAt.getTime() <= now.getTime()) return "expired";
  const placed = jakartaMonth(order.createdAt);
  const current = jakartaMonth(now);
  // An order from an earlier month does not hold a slot in this one.
  if (placed.year !== current.year || placed.month !== current.month) return "ok";
  const caps: Record<CapGroup, number | null> = {PIECES: limits.piecesMonthlyCap, ATELIER_EXTRAS: limits.extrasMonthlyCap};
  for (const group of CAP_GROUPS) {
    const cap = caps[group];
    if (cap != null && used[group] > cap) return "month_full";
  }
  return "ok";
}
