import {and, eq} from "drizzle-orm";
import {cartItems, db} from "@/lib/db";
import type {CustomConfig} from "@/lib/custom-studio";

export type CartLine = {slug: string; quantity: number; config: CustomConfig | null};

export async function getCartItems(userId: string): Promise<CartLine[]> {
  const rows = await db
    .select({slug: cartItems.productSlug, quantity: cartItems.quantity, config: cartItems.config})
    .from(cartItems)
    .where(eq(cartItems.userId, userId));
  return rows.map((row) => ({slug: row.slug, quantity: row.quantity, config: (row.config as CustomConfig | null) ?? null}));
}

// quantity <= 0 removes the line entirely rather than storing a zero.
//
// `config` is optional and, when omitted, is left untouched on an existing
// row — a plain quantity change from the cart drawer's +/- stepper must
// never wipe out the customisation already stored on that line. Passing it
// explicitly (from "Add to Bag" on the product page) sets/replaces it, same
// "last write wins" behaviour quantity itself already has.
export async function setCartItemQuantity(
  userId: string,
  slug: string,
  quantity: number,
  config?: CustomConfig | null
): Promise<void> {
  if (quantity <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.userId, userId), eq(cartItems.productSlug, slug)));
    return;
  }

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productSlug, slug)));

  if (existing) {
    await db
      .update(cartItems)
      .set({quantity, updatedAt: new Date(), ...(config !== undefined ? {config} : {})})
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productSlug, slug)));
    return;
  }

  await db.insert(cartItems).values({userId, productSlug: slug, quantity, config: config ?? null});
}

export async function clearCart(userId: string): Promise<void> {
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}
