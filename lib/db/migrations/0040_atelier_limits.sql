CREATE TABLE "limit_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"setting" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_by_email" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "limit_changes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rate_limit_hits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rate_limit_hits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "waiting_list" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"unsubscribe_token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"notified_at" timestamp,
	"unsubscribed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "waiting_list" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "cap_group" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfilment_stage" text DEFAULT 'received' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfilment_stage_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_by_email" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cap_group" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "max_per_order" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "lead_time_weeks_min" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "lead_time_weeks_max" integer;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "pieces_monthly_cap" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "pieces_max_per_order" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "extras_max_per_order" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "extras_monthly_cap" integer;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "wholesale_contact_url" text;--> statement-breakpoint
CREATE INDEX "rate_limit_hits_key_created" ON "rate_limit_hits" USING btree ("key","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "waiting_list_email_unique" ON "waiting_list" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "waiting_list_unsubscribe_token_unique" ON "waiting_list" USING btree ("unsubscribe_token");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_user_idempotency_key" ON "orders" USING btree ("user_id","idempotency_key");