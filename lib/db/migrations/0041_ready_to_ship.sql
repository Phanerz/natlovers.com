ALTER TABLE "order_items" ADD COLUMN "fulfilment_type" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fulfilment_type" text DEFAULT 'made_to_order' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "dispatch_note" text;