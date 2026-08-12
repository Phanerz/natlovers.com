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
  size: text("size").notNull(),
  materials: text("materials").array().notNull().default([]),
  shape: text("shape").notNull(),
  handleType: text("handle_type").notNull(),
  productType: text("product_type").notNull(),
  tags: text("tags").array().notNull().default([]),
  soldOut: boolean("sold_out").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Groups of 3 rows sharing `groupId` (position 1 = 'bag' image, 2 = 'testimony'
// text, 3 = 'bag_with_customer' image) drive the swipeable hero card deck.
export const testimonialCards = pgTable("testimonial_cards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  groupId: text("group_id").notNull(),
  position: integer("position").notNull(),
  imageUrl: text("image_url"),
  cardType: text("card_type").notNull(),
  testimonyText: text("testimony_text"),
  customerName: text("customer_name"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Hero card stack (Tinder-style swipeable deck on the homepage hero). Rows
// are shown in displayOrder; card_type picks which field the card renders
// from ('color' -> colorValue, 'image' -> imageUrl, 'testimony' -> textContent).
export const heroCards = pgTable("hero_cards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  displayOrder: integer("display_order").notNull().default(0),
  cardType: text("card_type").notNull().default("color"),
  colorValue: text("color_value"),
  imageUrl: text("image_url"),
  textContent: text("text_content"),
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
  image: text("image")
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
