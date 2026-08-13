import {count, eq} from "drizzle-orm";
import {db, heroCards, orders, products} from "@/lib/db";

export type DashboardStats = {
  totalProducts: number;
  activeProducts: number;
  hiddenProducts: number;
  heroCardCount: number;
  ordersAwaitingTransfer: number;
};

// Four independent live counts, run in parallel — no hardcoded numbers, so
// this always reflects the current Supabase state at the moment it's
// called, not a snapshot taken during development.
export async function getDashboardStats(): Promise<DashboardStats> {
  const [[totalRow], [activeRow], [heroRow], [awaitingRow]] = await Promise.all([
    db.select({value: count()}).from(products),
    db.select({value: count()}).from(products).where(eq(products.isActive, true)),
    db.select({value: count()}).from(heroCards),
    db.select({value: count()}).from(orders).where(eq(orders.status, "pending_transfer"))
  ]);

  const totalProducts = totalRow.value;
  const activeProducts = activeRow.value;

  return {
    totalProducts,
    activeProducts,
    hiddenProducts: totalProducts - activeProducts,
    heroCardCount: heroRow.value,
    ordersAwaitingTransfer: awaitingRow.value
  };
}
