ALTER TABLE "products" ALTER COLUMN "has_base_colour" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "has_handle_colour" SET DEFAULT true;--> statement-breakpoint
-- Backfill: existing products predate the default flip above and were left
-- at false/empty by the prior migration. Turn colour choice on for every
-- product that hasn't been explicitly configured one way or the other yet,
-- seeded with the same three template colours the admin form now starts
-- new products with, so the section isn't empty the moment it appears.
UPDATE "products"
SET "has_base_colour" = true,
    "base_colour_options" = '[{"label":"Natlovers Green","hex":"#344332"},{"label":"Black","hex":"#000000"},{"label":"White","hex":"#FFFFFF"}]'::jsonb
WHERE "has_base_colour" = false
  AND ("base_colour_options" IS NULL OR "base_colour_options" = '[]'::jsonb);--> statement-breakpoint
UPDATE "products"
SET "has_handle_colour" = true,
    "handle_colour_options" = '[{"label":"Natlovers Green","hex":"#344332"},{"label":"Black","hex":"#000000"},{"label":"White","hex":"#FFFFFF"}]'::jsonb
WHERE "has_handle_colour" = false
  AND ("handle_colour_options" IS NULL OR "handle_colour_options" = '[]'::jsonb);