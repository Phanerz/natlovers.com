ALTER TABLE "products" ADD COLUMN "has_base_colour" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "base_colour_options" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "has_handle_colour" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "handle_colour_options" jsonb;