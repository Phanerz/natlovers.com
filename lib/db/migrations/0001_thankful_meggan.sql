CREATE TABLE "testimonial_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"position" integer NOT NULL,
	"image_url" text,
	"card_type" text NOT NULL,
	"testimony_text" text,
	"customer_name" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
