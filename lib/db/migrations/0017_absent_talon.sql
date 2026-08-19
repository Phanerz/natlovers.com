CREATE TABLE "aoh_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"price_data" jsonb NOT NULL,
	"settings" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aoh_config" ENABLE ROW LEVEL SECURITY;