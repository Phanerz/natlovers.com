import {sql} from "drizzle-orm";
import {boolean, index, integer, jsonb, pgPolicy, pgTable, primaryKey, text, timestamp, uniqueIndex} from "drizzle-orm/pg-core";

type ProviderType = "oauth" | "email" | "credentials";

// RLS note (applies to every table below): the app's own Postgres role
// (see DB_POSTGRES_URL — connects as the Supabase-managed `postgres` role)
// has BYPASSRLS, confirmed via `select rolbypassrls from pg_roles`, so none
// of this affects the Next.js server's own queries. What it does affect is
// Supabase's auto-generated PostgREST/GraphQL API, which is reachable by
// anyone holding the project's anon key regardless of whether this app
// happens to use it — RLS is what stands between that API and this data.
//
// This app authenticates entirely through NextAuth (its own session table,
// checked server-side), not Supabase Auth — no Supabase JWT is ever issued
// for a signed-in user, so `auth.uid()` is always null for every request
// PostgREST receives here. A policy written as `auth.uid() = user_id`
// would look like a real "read your own row" rule but would never actually
// match anyone, since there's no session for it to match against — writing
// one would be misleading, not protective. So every PII-bearing table below
// gets RLS enabled with *no* policies for `anon`/`authenticated`, which
// means default-deny for the public API while the app itself is unaffected.
// Only genuinely public storefront data (products, hero cards) gets a real
// anon-readable policy, since that data is meant to be public regardless of
// which door it's read through.
export const products = pgTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    priceIdr: integer("price_idr").notNull(),
    description: text("description"),
    images: text("images").array().notNull().default([]),
    // Bags/Dolls-only.
    size: text("size"),
    materials: text("materials").array().notNull().default([]),
    // Free text rather than separate height/width/depth columns, so it can
    // honestly express handmade variance ("Approx. 30 x 20 x 15 cm") instead
    // of implying a precision the product doesn't have. Optional — an admin
    // fills it in when they have the real measurement; the product page
    // falls back to showing the Small/Medium/Large size instead when null.
    dimensions: text("dimensions"),
    // Bags-only.
    shape: text("shape"),
    handleType: text("handle_type"),
    // Accessories-only.
    accessoryCategory: text("accessory_category"),
    productType: text("product_type").notNull(),
    tags: text("tags").array().notNull().default([]),
    soldOut: boolean("sold_out").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    // Optional — most products don't track a count yet. When set, it's
    // decremented on payment confirmation (see markOrderPaid in lib/orders.ts)
    // and floored at 0 rather than going negative.
    stock: integer("stock"),
    // Includes the "NAT-" prefix (e.g. "NAT-BAG007"), stored whole rather than
    // split, so every read site (table, form, order emails) shows the same
    // string without reassembling it. Optional — older products have none.
    productCode: text("product_code").unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => [
    // Only active/visible products — a hidden or deactivated product must
    // stay invisible to the public API the same way it's invisible on the
    // storefront. Writes are never granted here: creating/editing products
    // stays server-only via the bypassing app role.
    pgPolicy("Public can view active products", {
      as: "permissive",
      for: "select",
      to: "anon",
      using: sql`${table.isActive} = true`
    })
  ]
).enableRLS();

// Hero card stack (Tinder-style swipeable deck on the homepage hero). Rows
// are shown in displayOrder; card_type picks which field the card renders
// from ('color' -> colorValue, 'image' -> imageUrl).
export const heroCards = pgTable(
  "hero_cards",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    displayOrder: integer("display_order").notNull().default(0),
    cardType: text("card_type").notNull().default("color"),
    colorValue: text("color_value"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  () => [
    // Every row here is meant to be shown on the public homepage — there's
    // no hidden/draft state, so no filter is needed on top of "public".
    pgPolicy("Public can view hero cards", {as: "permissive", for: "select", to: "anon", using: sql`true`})
  ]
).enableRLS();

// NextAuth @auth/drizzle-adapter Postgres schema, matched field-for-field to
// the adapter's own table definitions (packages/adapter-drizzle/src/lib/pg.ts)
// so DrizzleAdapter(db) works with no custom table mapping.
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", {mode: "date"}),
  image: text("image"),
  // App-specific additions beyond the adapter's required shape — the
  // adapter only ever reads/writes the four columns above, so these are
  // safely ignored by it and only touched by our own /api/account route.
  phone: text("phone"),
  bio: text("bio"),
  // Ordered list of up to 4 metric keys (see lib/admin-widgets.ts) an admin
  // has chosen to pin to their account-page overview — array order is
  // display order. Null/empty means "hasn't customized yet," which the app
  // treats as the same default 4-widget set the page always showed before
  // this was configurable, not an empty section. Non-admin accounts never
  // write this column at all (the picker UI is admin-gated), so it stays
  // null for every regular customer.
  adminWidgets: text("admin_widgets").array()
}).enableRLS();

// A customer's reusable, editable shipping address — kept separate from any
// order so it can be added/edited/reused across checkouts. What actually
// ships with a given order is a frozen copy on that order row (see the
// shipping* columns below), not a live reference to a row here, so editing
// or deleting a saved address here never rewrites history for an order
// that already shipped.
export const addresses = pgTable("addresses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, {onDelete: "cascade"}),
  label: text("label").notNull().default("Home"),
  recipientName: text("recipient_name").notNull(),
  phone: text("phone").notNull(),
  street: text("street").notNull(),
  city: text("city").notNull(),
  // Not every country uses a province/state — Singapore and Hong Kong
  // addresses, for instance, genuinely don't have one, so this stays
  // optional rather than forcing a fake value in to satisfy a NOT NULL.
  province: text("province"),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull().default("Indonesia"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}).enableRLS();

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, {onDelete: "cascade"}),
    productSlug: text("product_slug").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (table) => ({
    compositePk: primaryKey({columns: [table.userId, table.productSlug]})
  })
).enableRLS();

export const cartItems = pgTable(
  "cart_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, {onDelete: "cascade"}),
    productSlug: text("product_slug").notNull(),
    quantity: integer("quantity").notNull().default(1),
    // The customisation chosen when this line was added (a Custom Studio
    // CustomConfig — see lib/custom-studio.ts), or null for a product added
    // with no customisation, e.g. an Accessory. One line per product per
    // user (same composite PK as before), so re-adding the same product with
    // a different configuration replaces the stored config rather than
    // creating a second line — the same "last write wins" behaviour the
    // quantity field already has.
    config: jsonb("config"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => ({
    compositePk: primaryKey({columns: [table.userId, table.productSlug]})
  })
).enableRLS();

export const orders = pgTable("orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, {onDelete: "cascade"}),
  orderRef: text("order_ref").notNull().unique(),
  status: text("status").notNull().default("pending_transfer"),
  totalIdr: integer("total_idr").notNull(),
  bankName: text("bank_name").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Payment-confirmation audit trail. Stored as a plain email snapshot
  // rather than a userId FK so the record survives even if that admin
  // account is later renamed or removed — if a customer disputes a
  // payment, this needs to keep answering "who marked it paid and when"
  // regardless of what happens to the admin's account afterward.
  confirmedByEmail: text("confirmed_by_email"),
  confirmedAt: timestamp("confirmed_at"),
  // Shipment tracking, set once an admin fulfills a paid order.
  trackingCourier: text("tracking_courier"),
  trackingNumber: text("tracking_number"),
  // Shipping address, frozen at checkout time — same snapshot philosophy as
  // order_items' productName/priceIdr: this is what actually shipped, so it
  // must stay accurate even if the customer later edits or deletes the
  // saved address it was copied from.
  shippingRecipientName: text("shipping_recipient_name").notNull(),
  shippingPhone: text("shipping_phone").notNull(),
  shippingStreet: text("shipping_street").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingProvince: text("shipping_province"),
  shippingPostalCode: text("shipping_postal_code").notNull(),
  shippingCountry: text("shipping_country").notNull()
}).enableRLS();

// Snapshots product name/price at order time — deliberately not a foreign
// key to `products`, so an order stays accurate even if the product is
// later edited, deactivated, or deleted from the catalogue.
export const orderItems = pgTable("order_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, {onDelete: "cascade"}),
  productSlug: text("product_slug").notNull(),
  productName: text("product_name").notNull(),
  priceIdr: integer("price_idr").notNull(),
  quantity: integer("quantity").notNull(),
  // Snapshot of the cart line's config at checkout time, same snapshot
  // philosophy as productName/priceIdr above — what was actually ordered
  // must stay legible even if the cart line it came from is long gone.
  config: jsonb("config")
}).enableRLS();

// Single shared row (id "default") for the /aoh pricing calculator's rate
// table and settings — there's no login for that tool, so this is the one
// config every device reads and writes, last write wins. RLS enabled with
// no policies: same default-deny-to-the-public-API treatment as every other
// non-public table here, since this is internal shop pricing, not
// storefront content.
export const aohConfig = pgTable("aoh_config", {
  id: text("id").primaryKey().default("default"),
  priceData: jsonb("price_data").notNull(),
  settings: jsonb("settings").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}).enableRLS();

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, {onDelete: "cascade"}),
    type: text("type").$type<ProviderType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state")
  },
  (account) => ({
    compositePk: primaryKey({columns: [account.provider, account.providerAccountId]})
  })
).enableRLS();

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, {onDelete: "cascade"}),
  expires: timestamp("expires", {mode: "date"}).notNull()
}).enableRLS();

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", {mode: "date"}).notNull()
  },
  (verificationToken) => ({
    compositePk: primaryKey({columns: [verificationToken.identifier, verificationToken.token]})
  })
).enableRLS();

// Custom Studio intake. A request is the customer's *configuration* plus
// their inspiration photos — not an order. It carries an estimated price
// the studio can revise (finalPriceIdr) once someone has actually looked at
// what was asked for, which is why the two are separate columns rather than
// one price that gets overwritten: the quote and what the customer was
// originally shown both need to stay legible side by side.
//
// `configuration` is jsonb because each product type has a genuinely
// different shape (a bag has shape/handle/colour, a doll has subject and
// size) and modelling three divergent option sets as nullable columns would
// mean a table where most columns are null on most rows. The authoritative
// shapes live in lib/custom-studio.ts as zod schemas and are validated on
// write, so the looseness is at the storage layer only.
export const customRequests = pgTable(
  "custom_requests",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Human-quotable reference shown to the customer on the success screen
    // and used by the studio when they get back in touch. Null while the
    // row is still a draft — a draft has nothing to quote yet — and
    // assigned once at submit time.
    requestRef: text("request_ref").unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, {onDelete: "cascade"}),
    // One of shopProductTypes (Bags/Dolls/Apparels), matching the catalogue
    // vocabulary rather than inventing a second set of type names.
    productType: text("product_type").notNull(),
    configuration: jsonb("configuration").notNull().default({}),
    // Prices are stored in IDR like orders.totalIdr — IDR is the currency
    // the business actually operates in, and every display currency in the
    // app is a formatted conversion of it (see lib/format.ts). `currency`
    // records which one the customer was *looking at* when they submitted,
    // so a follow-up conversation can be held in the same units they saw.
    estimatedPriceIdr: integer("estimated_price_idr").notNull().default(0),
    finalPriceIdr: integer("final_price_idr"),
    currency: text("currency").notNull().default("IDR"),
    notes: text("notes"),
    status: text("status").notNull().default("draft"),
    // Studio-only. Never returned by any customer-facing query.
    adminNotes: text("admin_notes"),
    submittedAt: timestamp("submitted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => ({
    // A customer has at most one open draft at a time, so returning to
    // /custom resumes rather than accumulating abandoned rows. Enforced in
    // the database rather than by a read-then-write in the route, because
    // two tabs saving at once would otherwise both find "no draft" and both
    // insert. Partial, so it constrains only drafts and never submitted
    // requests — a customer may of course submit as many as they like.
    oneDraftPerUser: uniqueIndex("custom_requests_one_draft_per_user")
      .on(table.userId)
      .where(sql`status = 'draft'`),
    statusIdx: index("custom_requests_status_idx").on(table.status),
    userIdx: index("custom_requests_user_idx").on(table.userId)
  })
).enableRLS();

// Inspiration photos uploaded alongside a request. storageKey is the Vercel
// Blob pathname, kept separately from the public url so the blob can still
// be deleted after the fact — url alone is enough to display an image but
// not to manage it.
export const customRequestImages = pgTable(
  "custom_request_images",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    customRequestId: text("custom_request_id")
      .notNull()
      .references(() => customRequests.id, {onDelete: "cascade"}),
    url: text("url").notNull(),
    storageKey: text("storage_key").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (table) => ({
    requestIdx: index("custom_request_images_request_idx").on(table.customRequestId)
  })
).enableRLS();

// Single-row store-wide settings. Exists for the Custom Studio intake
// pause — the studio is one small team in Yogyakarta, and the honest
// failure mode of a public custom-order form is accepting more work than
// there are hands to make it. The pause is the capacity guardrail: it
// closes new submissions without taking the page down or losing drafts.
//
// Keyed by a fixed id rather than being a schemaless key/value store so
// each setting stays a real typed column.
export const storeSettings = pgTable("store_settings", {
  id: text("id").primaryKey().default("default"),
  customIntakePaused: boolean("custom_intake_paused").notNull().default(false),
  // Optional override for the message shown in place of the studio form.
  // Null falls back to the default copy in lib/custom-studio.ts.
  customIntakePausedMessage: text("custom_intake_paused_message"),
  updatedByEmail: text("updated_by_email"),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}).enableRLS();
