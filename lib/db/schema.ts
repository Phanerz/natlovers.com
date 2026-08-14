import {boolean, integer, pgTable, primaryKey, text, timestamp} from "drizzle-orm/pg-core";

type ProviderType = "oauth" | "email" | "credentials";

export const products = pgTable("products", {
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
});

// Hero card stack (Tinder-style swipeable deck on the homepage hero). Rows
// are shown in displayOrder; card_type picks which field the card renders
// from ('color' -> colorValue, 'image' -> imageUrl).
export const heroCards = pgTable("hero_cards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  displayOrder: integer("display_order").notNull().default(0),
  cardType: text("card_type").notNull().default("color"),
  colorValue: text("color_value"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

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
  bio: text("bio")
});

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
});

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
);

export const cartItems = pgTable(
  "cart_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, {onDelete: "cascade"}),
    productSlug: text("product_slug").notNull(),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => ({
    compositePk: primaryKey({columns: [table.userId, table.productSlug]})
  })
);

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
});

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
  quantity: integer("quantity").notNull()
});

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
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, {onDelete: "cascade"}),
  expires: timestamp("expires", {mode: "date"}).notNull()
});

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
);
