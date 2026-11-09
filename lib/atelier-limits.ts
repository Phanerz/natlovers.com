// Pure rules for the atelier's limits. No database and no browser APIs, so the same code runs in
// the order transaction, in the bag routes and in the tests.

export const CAP_GROUPS = ["PIECES", "ATELIER_EXTRAS"] as const;
export type CapGroup = (typeof CAP_GROUPS)[number];

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
};

export type LimitViolation =
  | {code: "product_max"; slug: string; max: number}
  | {code: "group_max"; group: CapGroup; max: number}
  | {code: "month_full"; group: CapGroup; remaining: number};

// Both per-order limits apply: the total quantity in a group, and each product on its own.
export function checkPerOrder(lines: LimitLine[], limits: Limits): LimitViolation | null {
  for (const line of lines) {
    if (line.quantity > line.maxPerOrder) return {code: "product_max", slug: line.slug, max: line.maxPerOrder};
  }
  for (const group of CAP_GROUPS) {
    const total = groupQuantity(lines, group);
    const max = groupMaxPerOrder(group, limits);
    if (total > max) return {code: "group_max", group, max};
  }
  return null;
}

export function groupQuantity(lines: LimitLine[], group: CapGroup): number {
  return lines.reduce((sum, line) => {
    if (line.group === group) return sum + line.quantity;
    // Add-ons ride on a piece but belong to the extras group.
    if (group === "ATELIER_EXTRAS") return sum + (line.addonCount ?? 0) * line.quantity;
    return sum;
  }, 0);
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
  return checkPerOrder(lines, limits) ?? checkMonthly(lines, limits, used);
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

export function orderExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + ORDER_HOLD_MS);
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
