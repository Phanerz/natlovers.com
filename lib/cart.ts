import {and, eq} from "drizzle-orm";
import {cartItems, db} from "@/lib/db";

export type CartLine = {slug: string; quantity: number};

export async function getCartItems(userId: string): Promise<CartLine[]> {
  const rows = await db
    .select({slug: cartItems.productSlug, quantity: cartItems.quantity})
    .from(cartItems)
    .where(eq(cartItems.userId, userId));
  return rows;
}

// quantity <= 0 removes the line entirely rather than storing a zero.
export async function setCartItemQuantity(userId: string, slug: string, quantity: number): Promise<void> {
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
      .set({quantity, updatedAt: new Date()})
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productSlug, slug)));
    return;
  }

  await db.insert(cartItems).values({userId, productSlug: slug, quantity});
}

export async function clearCart(userId: string): Promise<void> {
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}
