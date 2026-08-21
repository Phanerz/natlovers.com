ALTER TABLE "cart_items" ADD COLUMN "config" jsonb;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "config" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "dimensions" text;