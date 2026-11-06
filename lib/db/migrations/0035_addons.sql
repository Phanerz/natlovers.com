CREATE TABLE "addon_colour_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addon_colour_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "addon_colours" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"label" text NOT NULL,
	"kind" text DEFAULT 'solid' NOT NULL,
	"hexes" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addon_colours" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "addon_images" (
	"id" text PRIMARY KEY NOT NULL,
	"species_id" text,
	"pose_id" text,
	"colour_id" text,
	"url" text NOT NULL,
	"storage_key" text,
	"caption" text,
	"zoom" double precision DEFAULT 1 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addon_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "addon_poses" (
	"id" text PRIMARY KEY NOT NULL,
	"species_id" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addon_poses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "addon_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"price_idr" integer DEFAULT 180000 NOT NULL,
	"price_usd_cents" integer DEFAULT 1000 NOT NULL,
	"max_per_bag" integer DEFAULT 4 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addon_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "addon_species" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'animal' NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"colour_group_id" text NOT NULL,
	"pose_label" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addon_species" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_item_addons" (
	"id" text PRIMARY KEY NOT NULL,
	"order_item_id" text NOT NULL,
	"species_id" text,
	"species_name" text NOT NULL,
	"colour_label" text NOT NULL,
	"colour_kind" text DEFAULT 'solid' NOT NULL,
	"colour_hexes" jsonb NOT NULL,
	"pose_label" text,
	"note" text,
	"image_url" text,
	"price_idr" integer NOT NULL,
	"price_usd_cents" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_item_addons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "addon_colours" ADD CONSTRAINT "addon_colours_group_id_addon_colour_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."addon_colour_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_images" ADD CONSTRAINT "addon_images_species_id_addon_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."addon_species"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_images" ADD CONSTRAINT "addon_images_pose_id_addon_poses_id_fk" FOREIGN KEY ("pose_id") REFERENCES "public"."addon_poses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_images" ADD CONSTRAINT "addon_images_colour_id_addon_colours_id_fk" FOREIGN KEY ("colour_id") REFERENCES "public"."addon_colours"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_poses" ADD CONSTRAINT "addon_poses_species_id_addon_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."addon_species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_species" ADD CONSTRAINT "addon_species_colour_group_id_addon_colour_groups_id_fk" FOREIGN KEY ("colour_group_id") REFERENCES "public"."addon_colour_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_addons" ADD CONSTRAINT "order_item_addons_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addon_colours_group_idx" ON "addon_colours" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "addon_images_species_idx" ON "addon_images" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "addon_poses_species_idx" ON "addon_poses" USING btree ("species_id");--> statement-breakpoint
CREATE UNIQUE INDEX "addon_species_slug_idx" ON "addon_species" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "order_item_addons_item_idx" ON "order_item_addons" USING btree ("order_item_id");