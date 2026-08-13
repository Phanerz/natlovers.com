import {and, eq} from "drizzle-orm";
import {db, wishlistItems} from "@/lib/db";

export async function getWishlistSlugs(userId: string): Promise<string[]> {
  const rows = await db.select({slug: wishlistItems.productSlug}).from(wishlistItems).where(eq(wishlistItems.userId, userId));
  return rows.map((row) => row.slug);
}

export async function toggleWishlistItem(userId: string, slug: string): Promise<{wishlisted: boolean}> {
  const [existing] = await db
    .select()
    .from(wishlistItems)
    .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productSlug, slug)));

  if (existing) {
    await db.delete(wishlistItems).where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productSlug, slug)));
    return {wishlisted: false};
  }

  await db.insert(wishlistItems).values({userId, productSlug: slug});
  return {wishlisted: true};
}
