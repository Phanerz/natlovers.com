ALTER TABLE "order_items" ADD COLUMN "price_usd_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "currency" text DEFAULT 'IDR' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "total_usd_cents" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_usd_cents" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "compare_at_price_usd_cents" integer;