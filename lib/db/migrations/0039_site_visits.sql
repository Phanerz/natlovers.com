CREATE TABLE "site_visits" (
	"id" text PRIMARY KEY NOT NULL,
	"country" text NOT NULL,
	"device" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "site_visits_created_idx" ON "site_visits" USING btree ("created_at");