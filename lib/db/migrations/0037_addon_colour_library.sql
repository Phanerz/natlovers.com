CREATE TABLE "addon_library_colours" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"hex" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addon_library_colours" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "addon_library_colours_name_idx" ON "addon_library_colours" USING btree ("name");