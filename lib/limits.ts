import {eq, sql} from "drizzle-orm";
import {db, limitChanges, storeSettings} from "@/lib/db";
import {
  DEFAULT_LIMITS,
  jakartaMonth,
  jakartaMonthRange,
  nextMonth,
  type CapGroup,
  type Limits
} from "@/lib/atelier-limits";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Executor = typeof db | Tx;

export type StoreLimits = Limits & {wholesaleContactUrl: string | null};

const DEFAULTS: StoreLimits = {...DEFAULT_LIMITS, wholesaleContactUrl: null};

function fromRow(row: typeof storeSettings.$inferSelect): StoreLimits {
  return {
    piecesMonthlyCap: row.piecesMonthlyCap,
    piecesMaxPerOrder: row.piecesMaxPerOrder,
    extrasMaxPerOrder: row.extrasMaxPerOrder,
    extrasMonthlyCap: row.extrasMonthlyCap,
    wholesaleContactUrl: row.wholesaleContactUrl?.trim() || null
  };
}

// The limits in force. Falls back to the defaults if the settings row or the new columns are not
// there yet, so a storefront that is ahead of its migration still works.
export async function getLimits(executor: Executor = db): Promise<StoreLimits> {
  try {
    const [row] = await executor.select().from(storeSettings).where(eq(storeSettings.id, "default"));
    return row ? fromRow(row) : DEFAULTS;
  } catch (error) {
    console.error("Atelier limits unavailable, using defaults", error);
    return DEFAULTS;
  }
}

// Locks the single settings row for the rest of the transaction. Every order placement takes this
// lock first, so two checkouts racing for the last slot are served one after the other.
export async function lockLimits(tx: Tx): Promise<StoreLimits> {
  await tx.execute(sql`insert into store_settings (id) values ('default') on conflict (id) do nothing`);
  const [row] = await tx.select().from(storeSettings).where(eq(storeSettings.id, "default")).for("update");
  return row ? fromRow(row) : DEFAULTS;
}

export type MonthlyUsage = {PIECES: number; ATELIER_EXTRAS: number};

// What the current Jakarta calendar month has already used. Counted: orders awaiting transfer that
// have not expired, paid orders and shipped orders. Cancelled and expired orders free their slots.
export async function getMonthlyUsage(executor: Executor = db, now: Date = new Date()): Promise<MonthlyUsage> {
  const {start, end} = jakartaMonthRange(jakartaMonth(now));
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const nowIso = now.toISOString();

  const rows = await executor.execute<{grp: string; qty: string | number}>(sql`
    select
      coalesce(oi.cap_group, p.cap_group,
        case when p.product_type in ('Dolls', 'Accessories') then 'ATELIER_EXTRAS' else 'PIECES' end) as grp,
      sum(oi.quantity) as qty
    from order_items oi
    join orders o on o.id = oi.order_id
    left join products p on p.slug = oi.product_slug
    where o.created_at >= ${startIso}::timestamp
      and o.created_at < ${endIso}::timestamp
      and (
        o.status in ('paid', 'fulfilled')
        or (o.status = 'pending_transfer' and (o.expires_at is null or o.expires_at > ${nowIso}::timestamp))
      )
    group by 1
  `);

  const addonRows = await executor.execute<{qty: string | number | null}>(sql`
    select sum(oi.quantity * (select count(*) from order_item_addons a where a.order_item_id = oi.id)) as qty
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.created_at >= ${startIso}::timestamp
      and o.created_at < ${endIso}::timestamp
      and (
        o.status in ('paid', 'fulfilled')
        or (o.status = 'pending_transfer' and (o.expires_at is null or o.expires_at > ${nowIso}::timestamp))
      )
  `);

  const usage: MonthlyUsage = {PIECES: 0, ATELIER_EXTRAS: 0};
  for (const row of rows) {
    const group = row.grp === "ATELIER_EXTRAS" ? "ATELIER_EXTRAS" : "PIECES";
    usage[group] += Number(row.qty ?? 0);
  }
  usage.ATELIER_EXTRAS += Number(addonRows[0]?.qty ?? 0);
  return usage;
}

export function nextMonthNumber(now: Date = new Date()): number {
  return nextMonth(jakartaMonth(now)).month;
}

export type AvailabilityView = {
  piecesMonthFull: boolean;
  nextMonth: number;
  piecesMaxPerOrder: number;
  extrasMaxPerOrder: number;
  wholesaleContactUrl: string | null;
};

// What the storefront may know. Deliberately no counts: only whether the month is full.
export async function getAvailability(now: Date = new Date()): Promise<AvailabilityView> {
  const limits = await getLimits();
  let piecesMonthFull = false;
  try {
    const used = await getMonthlyUsage(db, now);
    piecesMonthFull = used.PIECES >= limits.piecesMonthlyCap;
  } catch (error) {
    console.error("Monthly usage unavailable", error);
  }
  return {
    piecesMonthFull,
    nextMonth: nextMonthNumber(now),
    piecesMaxPerOrder: limits.piecesMaxPerOrder,
    extrasMaxPerOrder: limits.extrasMaxPerOrder,
    wholesaleContactUrl: limits.wholesaleContactUrl
  };
}

export type LimitPatch = Partial<{
  piecesMonthlyCap: number;
  piecesMaxPerOrder: number;
  extrasMaxPerOrder: number;
  extrasMonthlyCap: number | null;
  wholesaleContactUrl: string | null;
}>;

const SETTING_LABELS: Record<keyof LimitPatch, string> = {
  piecesMonthlyCap: "Pieces monthly cap",
  piecesMaxPerOrder: "Pieces per order",
  extrasMaxPerOrder: "Extras per order",
  extrasMonthlyCap: "Extras monthly cap",
  wholesaleContactUrl: "Contact link for larger orders"
};

// Applies a change and writes one log row per value that actually changed.
export async function updateLimits(patch: LimitPatch, adminEmail: string): Promise<StoreLimits> {
  return db.transaction(async (tx) => {
    const current = await lockLimits(tx);
    const next: StoreLimits = {...current};
    const log: {setting: string; oldValue: string | null; newValue: string | null}[] = [];

    for (const key of Object.keys(patch) as (keyof LimitPatch)[]) {
      const value = patch[key];
      if (value === undefined) continue;
      const before = current[key];
      if (before === value) continue;
      (next as Record<string, unknown>)[key] = value;
      log.push({setting: SETTING_LABELS[key], oldValue: before == null ? null : String(before), newValue: value == null ? null : String(value)});
    }

    if (!log.length) return current;

    await tx
      .update(storeSettings)
      .set({
        piecesMonthlyCap: next.piecesMonthlyCap,
        piecesMaxPerOrder: next.piecesMaxPerOrder,
        extrasMaxPerOrder: next.extrasMaxPerOrder,
        extrasMonthlyCap: next.extrasMonthlyCap,
        wholesaleContactUrl: next.wholesaleContactUrl,
        updatedByEmail: adminEmail,
        updatedAt: new Date()
      })
      .where(eq(storeSettings.id, "default"));
    await tx.insert(limitChanges).values(log.map((entry) => ({...entry, changedByEmail: adminEmail})));
    return next;
  });
}

export type GroupUsage = {group: CapGroup; used: number};
