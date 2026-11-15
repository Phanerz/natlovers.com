import {inArray} from "drizzle-orm";
import {db, products} from "@/lib/db";
import {getCartItems, type CartConfig} from "@/lib/cart";
import {
  checkAll,
  isReadyToShip,
  productMaxPerOrder,
  resolveCapGroup,
  type LimitLine,
  type LimitViolation
} from "@/lib/atelier-limits";
import {getLimits, getMonthlyUsage, getReadyAvailability, nextMonthNumber} from "@/lib/limits";

export type CartLimitResult = {ok: true} | {ok: false; violation: LimitViolation; nextMonth: number};

// Checks a bag as it would look after one change, on the server, whatever the browser claims.
// Decreasing a quantity or removing a line is always allowed. Used when adding to the bag and when
// changing a quantity; the order transaction checks again at checkout.
export async function checkBagChange(userId: string, slug: string, newQuantity: number, newConfig?: CartConfig | null): Promise<CartLimitResult> {
  const cart = await getCartItems(userId);
  const current = cart.find((line) => line.slug === slug);
  if (newQuantity <= (current?.quantity ?? 0)) {
    return {ok: true};
  }

  const lines = cart.filter((line) => line.slug !== slug).map((line) => ({slug: line.slug, quantity: line.quantity, config: line.config}));
  lines.push({slug, quantity: newQuantity, config: newConfig !== undefined ? newConfig : (current?.config ?? null)});

  const [limits, rows] = await Promise.all([
    getLimits(),
    db
      .select({
        slug: products.slug,
        productType: products.productType,
        capGroup: products.capGroup,
        maxPerOrder: products.maxPerOrder,
        fulfilmentType: products.fulfilmentType
      })
      .from(products)
      .where(
        inArray(
          products.slug,
          lines.map((line) => line.slug)
        )
      )
  ]);
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const available = await getReadyAvailability(
    db,
    rows.filter((row) => isReadyToShip(row.fulfilmentType)).map((row) => row.slug)
  );

  const limitLines: LimitLine[] = [];
  for (const line of lines) {
    const product = bySlug.get(line.slug);
    if (!product) continue;
    const group = resolveCapGroup(product.capGroup, product.productType);
    limitLines.push({
      slug: line.slug,
      quantity: line.quantity,
      group,
      maxPerOrder: productMaxPerOrder(product, group, limits),
      addonCount: line.config?.addons?.length ?? 0,
      ...(isReadyToShip(product.fulfilmentType) ? {ready: true, available: available.get(line.slug) ?? 0} : {})
    });
  }

  const used = await getMonthlyUsage();
  const violation = checkAll(limitLines, limits, used);
  return violation ? {ok: false, violation, nextMonth: nextMonthNumber()} : {ok: true};
}
