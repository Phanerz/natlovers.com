ALTER TABLE "products" ADD COLUMN "compare_at_price_idr" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cost_price_idr" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "short_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "has_personalisation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "personalisation_options" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "subcategory" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "collections" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "low_stock_threshold" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "allow_backorders" text DEFAULT 'deny' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "vendor" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "meta_title" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "meta_description" text;--> statement-breakpoint
-- Backfill: preserve every existing product's current storefront visibility
-- exactly. status stays 'active' for all of them (nothing was ever a draft
-- under the old model); a currently-inactive product becomes visibility =
-- 'hidden' rather than status = 'draft', since it was previously live and
-- got hidden, not something that never published. published_at is set to
-- created_at for products already active, left null for hidden ones (they
-- can pick up a real published_at whenever they're unhidden through the
-- admin, same as a real publish).
UPDATE "products" SET "visibility" = 'hidden' WHERE "is_active" = false;--> statement-breakpoint
UPDATE "products" SET "published_at" = "created_at" WHERE "is_active" = true;