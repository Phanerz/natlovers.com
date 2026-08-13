ALTER TABLE "products" ALTER COLUMN "size" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "shape" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "handle_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "accessory_category" text;