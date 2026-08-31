CREATE TABLE "body_shapes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"shape_type" text NOT NULL,
	"width_cm" double precision,
	"width_bottom_cm" double precision,
	"height_cm" double precision,
	"depth_cm" double precision,
	"diameter_cm" double precision,
	"thickness_cm" double precision,
	"in_stock" boolean DEFAULT true NOT NULL,
	"notes" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "body_shape_id" text;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "size";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "size_dimensions";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "size_price_delta_idr";--> statement-breakpoint
ALTER TABLE "body_shapes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_body_shape_id_body_shapes_id_fk" FOREIGN KEY ("body_shape_id") REFERENCES "public"."body_shapes"("id") ON DELETE set null ON UPDATE no action;
