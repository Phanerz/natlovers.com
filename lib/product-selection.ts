import {z} from "zod";
import {ADDON_MAX_HARD_LIMIT, addonPickSchema} from "@/lib/addon-shared";
import {optionAnswersSchema, resolvedLineSchema} from "@/lib/product-options";

// A cart/order line's saved configuration used to only ever be a Custom
// Studio CustomConfig (lib/custom-studio.ts) - a rigid, per-type enum shape.
// The product page's own customiser (admin-defined base/handle colour
// swatches, plus an optional personalisation note) doesn't fit that shape
// at all: colour options are free text/hex per product, not a fixed enum
// Custom Studio can validate against.
// This is the plain, permissive counterpart for that - still validated
// (nothing unchecked reaches the database), just not tied to Custom
// Studio's schema. lib/cart.ts and the cart/checkout API routes accept
// either shape on a line, since a line saved from the product page uses
// this one and a line saved via "Customise This Bag" still uses the
// original CustomConfig.
export const productSelectionSchema = z.object({
  kind: z.literal("productSelection"),
  baseColour: z.string().trim().max(120).optional(),
  handleColour: z.string().trim().max(120).optional(),
  // A free-text note the customer writes for a product with Personalisation
  // turned on (see products.hasPersonalisation) - frozen into the order at
  // checkout the same as every other config field, so it can't be changed
  // after purchase.
  personalisationNote: z.string().trim().max(500).optional(),
  // Choices made through the admin-defined options on the product page (see
  // lib/product-options.ts). `answers` is what the customer picked; `lines`
  // and `extraIdr` are the readable receipt and the extra cost, recomputed on
  // the server when the order is placed so they can never be tampered with.
  // The felted animals added through Make it yours: ids the server re-checks
  // at checkout, plus the readable priced lines the cart shows. The lines are
  // overwritten from the database when the order is placed.
  addons: z.array(addonPickSchema).max(ADDON_MAX_HARD_LIMIT).optional(),
  addonLines: z.array(resolvedLineSchema).max(ADDON_MAX_HARD_LIMIT).optional(),
  custom: z
    .object({
      answers: optionAnswersSchema,
      lines: z.array(resolvedLineSchema).max(60).optional(),
      extraIdr: z.number().int().min(0).optional()
    })
    .optional()
});

export type ProductSelection = z.infer<typeof productSelectionSchema>;
