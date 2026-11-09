import {z} from "zod";
import {ADDON_MAX_HARD_LIMIT, addonPickSchema} from "@/lib/addon-shared";
import {optionAnswersSchema, resolvedLineSchema} from "@/lib/product-options";

// A cart/order line's saved configuration: what the customer chose on the
// product page (admin-defined base/handle colour swatches, an optional
// personalisation note, custom options and felted animals). Colour options are
// free text/hex per product, so this is validated here, and nothing unchecked
// reaches the database. lib/cart.ts and the cart/checkout API routes accept only
// this shape on a line.
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
