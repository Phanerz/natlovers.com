ALTER TABLE "products" ADD COLUMN "stock" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_code" text;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_product_code_unique" UNIQUE("product_code");