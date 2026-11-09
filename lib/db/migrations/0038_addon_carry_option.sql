ALTER TABLE "addon_species" ADD COLUMN "carry_option" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order_item_addons" ADD COLUMN "carry_label" text;