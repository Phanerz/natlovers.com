import {and, desc, eq, gte, inArray, sql} from "drizzle-orm";
import {cartItems, db, orderItems, orders, products, siteVisits, users, wishlistItems} from "@/lib/db";

// What customers have been doing, read from the tables the shop already keeps: orders,
// bags (the saved cart of a signed-in customer) and likes (the wishlist). Admin only.

export type ActivityKind = "order" | "bag" | "like";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  at: string;
  customer: {id: string | null; name: string | null; email: string | null; image: string | null};
  product: {slug: string; name: string | null};
  // Order: "x2, NAT-12345678, Paid". Bag: "x1". Like: null.
  detail: string | null;
};

export type ActivityCounts = {order: number; bag: number; like: number};

export type ActivityResult = {items: ActivityItem[]; counts: ActivityCounts; days: number};

const STATUS_WORDS: Record<string, string> = {pending_transfer: "Awaiting payment", paid: "Paid", fulfilled: "Shipped"};

const WINDOW_DAYS = 30;

export async function getActivity(options: {productSlug?: string; limit?: number} = {}): Promise<ActivityResult> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const slug = options.productSlug;
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [orderRows, bagRows, likeRows, orderCount, bagCount, likeCount] = await Promise.all([
    db
      .select({
        id: orderItems.id,
        slug: orderItems.productSlug,
        name: orderItems.productName,
        quantity: orderItems.quantity,
        orderRef: orders.orderRef,
        status: orders.status,
        at: orders.createdAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .leftJoin(users, eq(users.id, orders.userId))
      .where(slug ? eq(orderItems.productSlug, slug) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(limit),
    db
      .select({
        slug: cartItems.productSlug,
        quantity: cartItems.quantity,
        at: cartItems.updatedAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image
      })
      .from(cartItems)
      .innerJoin(users, eq(users.id, cartItems.userId))
      .where(slug ? eq(cartItems.productSlug, slug) : undefined)
      .orderBy(desc(cartItems.updatedAt))
      .limit(limit),
    db
      .select({
        slug: wishlistItems.productSlug,
        at: wishlistItems.createdAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image
      })
      .from(wishlistItems)
      .innerJoin(users, eq(users.id, wishlistItems.userId))
      .where(slug ? eq(wishlistItems.productSlug, slug) : undefined)
      .orderBy(desc(wishlistItems.createdAt))
      .limit(limit),
    db
      .select({n: sql<number>`count(*)::int`})
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(gte(orders.createdAt, since), slug ? eq(orderItems.productSlug, slug) : undefined)),
    db
      .select({n: sql<number>`count(*)::int`})
      .from(cartItems)
      .where(and(gte(cartItems.updatedAt, since), slug ? eq(cartItems.productSlug, slug) : undefined)),
    db
      .select({n: sql<number>`count(*)::int`})
      .from(wishlistItems)
      .where(and(gte(wishlistItems.createdAt, since), slug ? eq(wishlistItems.productSlug, slug) : undefined))
  ]);

  // Bags and likes only hold a slug, so product names come from the catalogue.
  const slugs = Array.from(new Set([...bagRows.map((row) => row.slug), ...likeRows.map((row) => row.slug)]));
  const names = new Map<string, string>();
  if (slugs.length) {
    const found = await db.select({slug: products.slug, name: products.name}).from(products).where(inArray(products.slug, slugs));
    found.forEach((row) => names.set(row.slug, row.name));
  }

  const items: ActivityItem[] = [
    ...orderRows.map<ActivityItem>((row) => ({
      id: `o-${row.id}`,
      kind: "order",
      at: row.at.toISOString(),
      customer: {id: row.userId, name: row.userName, email: row.userEmail, image: row.userImage},
      product: {slug: row.slug, name: row.name},
      detail: [`x${row.quantity}`, row.orderRef, STATUS_WORDS[row.status] ?? row.status].join(", ")
    })),
    ...bagRows.map<ActivityItem>((row) => ({
      id: `b-${row.userId}-${row.slug}`,
      kind: "bag",
      at: row.at.toISOString(),
      customer: {id: row.userId, name: row.userName, email: row.userEmail, image: row.userImage},
      product: {slug: row.slug, name: names.get(row.slug) ?? null},
      detail: `x${row.quantity}`
    })),
    ...likeRows.map<ActivityItem>((row) => ({
      id: `l-${row.userId}-${row.slug}`,
      kind: "like",
      at: row.at.toISOString(),
      customer: {id: row.userId, name: row.userName, email: row.userEmail, image: row.userImage},
      product: {slug: row.slug, name: names.get(row.slug) ?? null},
      detail: null
    }))
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit * 2);

  return {
    items,
    counts: {order: orderCount[0]?.n ?? 0, bag: bagCount[0]?.n ?? 0, like: likeCount[0]?.n ?? 0},
    days: WINDOW_DAYS
  };
}

// Where new visitors come from: the anonymous country-level records kept for visitors who
// chose "Accept all" on the cookie notice. Empty (not an error) before that table exists.
export async function getVisitorCountries(days = WINDOW_DAYS): Promise<{country: string; visits: number}[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    return await db
      .select({country: siteVisits.country, visits: sql<number>`count(*)::int`})
      .from(siteVisits)
      .where(gte(siteVisits.createdAt, since))
      .groupBy(siteVisits.country)
      .orderBy(desc(sql`count(*)`))
      .limit(12);
  } catch {
    return [];
  }
}
