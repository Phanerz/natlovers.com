CREATE TABLE "catalogue_banners" (
	"id" text PRIMARY KEY NOT NULL,
	"eyebrow" text,
	"title" text NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"cta_label" text,
	"destination_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"category" text,
	"insert_after" integer DEFAULT 6 NOT NULL,
	"desktop_span" text DEFAULT '2x1' NOT NULL,
	"mobile_span" text DEFAULT 'full' NOT NULL,
	"overlay" text DEFAULT 'dark' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalogue_banners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "Public can view active catalogue banners" ON "catalogue_banners" AS PERMISSIVE FOR SELECT TO "anon" USING (is_active = true);