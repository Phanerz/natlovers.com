CREATE TABLE "hero_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"card_type" text DEFAULT 'color' NOT NULL,
	"color_value" text,
	"image_url" text,
	"text_content" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "hero_cards" ("id", "display_order", "card_type", "color_value") VALUES
	(gen_random_uuid(), 0, 'color', '#E63946'),
	(gen_random_uuid(), 1, 'color', '#F3722C'),
	(gen_random_uuid(), 2, 'color', '#F8961E'),
	(gen_random_uuid(), 3, 'color', '#F9C74F'),
	(gen_random_uuid(), 4, 'color', '#90BE6D'),
	(gen_random_uuid(), 5, 'color', '#43AA8B'),
	(gen_random_uuid(), 6, 'color', '#4D908E'),
	(gen_random_uuid(), 7, 'color', '#277DA1'),
	(gen_random_uuid(), 8, 'color', '#577590'),
	(gen_random_uuid(), 9, 'color', '#5E60CE'),
	(gen_random_uuid(), 10, 'color', '#7209B7'),
	(gen_random_uuid(), 11, 'color', '#B5179E'),
	(gen_random_uuid(), 12, 'color', '#F72585'),
	(gen_random_uuid(), 13, 'color', '#FF6B6B'),
	(gen_random_uuid(), 14, 'color', '#6D6875');
