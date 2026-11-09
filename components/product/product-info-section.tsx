import type {ReactNode} from "react";
import {ProductAccordionRow} from "@/components/product/product-accordion-row";
import type {AdminProduct} from "@/lib/admin-products";
import {sanitizeDescriptionHtml} from "@/lib/sanitize-html";

// Real, confirmed store policy  -  English only, same reasoning as the
// reassurance bar: this is policy text with legal weight, not UI copy, so it
// isn't run through an unreviewed translation.
const SHIPPING_AND_RETURNS_COPY = [
  "All Natlovers pieces are handcrafted to order. Typical production and delivery time is 1–3 weeks, occasionally longer for complex custom work or during high demand.",
  "As each item is handmade, we do not accept returns and we do not give money back. If a piece arrives damaged or is not the one you ordered, tell us within one day of receiving it. The buyer pays the shipping, and we tell you the amount after you order. A customised order can be changed until production begins."
];

// Below the fold: the story of the piece on the left (with its care and
// shipping notes), and  -  when the piece offers it  -  personalisation on the
// right, in the same two columns as the gallery and buying column above. A
// piece with nothing to personalise gives the story the full width.
export function ProductInfoSection({product, customiser}: {product: AdminProduct; customiser?: ReactNode}) {
  const hasMaterials = product.materials.length > 0;

  return (
    <div
      id="details"
      className={`pdp-details ${
        customiser ? "lg:grid-cols-2 lg:gap-[30px] xl:gap-[48px]" : "lg:grid-cols-1"
      }`}
    >
      <div className="min-w-0">
        <h2 className="pdp-section-title">Product Details</h2>
        {product.description?.trim() ? (
          // Re-sanitized here too (not just on write in lib/admin-products.ts)
          // as defense in depth  -  render-site sanitization stays correct even
          // if a row were ever written by some other path. white-space:
          // pre-wrap is kept so a pre-rich-text-editor plain-text description
          // (no markup, just line breaks) still renders exactly as before.
          <div
            className="prose-description pdp-prose whitespace-pre-wrap"
            dangerouslySetInnerHTML={{__html: sanitizeDescriptionHtml(product.description)}}
          />
        ) : (
          <p className="pdp-prose">No description provided yet.</p>
        )}

        <div className="pdp-accordions">
          {/* The material names themselves, size and dimensions live in the
              specs panel in the purchase column (see product-specs-panel.tsx)
              - this row is just the care note that panel has no room for. */}
          {hasMaterials ? (
            <ProductAccordionRow title="Material & Care">
              <p>Undyed natural fibre, handwoven. The material is the colour.</p>
            </ProductAccordionRow>
          ) : null}

          <ProductAccordionRow title="Shipping & Returns">
            {SHIPPING_AND_RETURNS_COPY.map((paragraph) => (
              <p key={paragraph} className="mt-2 first:mt-0">
                {paragraph}
              </p>
            ))}
          </ProductAccordionRow>
        </div>
      </div>

      {customiser ? <div className="min-w-0">{customiser}</div> : null}
    </div>
  );
}
