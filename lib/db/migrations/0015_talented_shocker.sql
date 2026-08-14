CREATE TABLE "custom_request_images" (
	"id" text PRIMARY KEY NOT NULL,
	"custom_request_id" text NOT NULL,
	"url" text NOT NULL,
	"storage_key" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_request_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "custom_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"request_ref" text,
	"user_id" text NOT NULL,
	"product_type" text NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"estimated_price_idr" integer DEFAULT 0 NOT NULL,
	"final_price_idr" integer,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"notes" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"admin_notes" text,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_requests_request_ref_unique" UNIQUE("request_ref")
);
--> statement-breakpoint
ALTER TABLE "custom_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"custom_intake_paused" boolean DEFAULT false NOT NULL,
	"custom_intake_paused_message" text,
	"updated_by_email" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "custom_request_images" ADD CONSTRAINT "custom_request_images_custom_request_id_custom_requests_id_fk" FOREIGN KEY ("custom_request_id") REFERENCES "public"."custom_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_requests" ADD CONSTRAINT "custom_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_request_images_request_idx" ON "custom_request_images" USING btree ("custom_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_requests_one_draft_per_user" ON "custom_requests" USING btree ("user_id") WHERE status = 'draft';--> statement-breakpoint
CREATE INDEX "custom_requests_status_idx" ON "custom_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "custom_requests_user_idx" ON "custom_requests" USING btree ("user_id");