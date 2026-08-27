import {materialLabels, sizeLabels} from "@/app/catalogue/shop-data";
import {ProductAccordionRow} from "@/components/product/product-accordion-row";
import type {AdminProduct} from "@/lib/admin-products";
import {sanitizeDescriptionHtml} from "@/lib/sanitize-html";

// Real, confirmed store policy  -  English only, same reasoning as the
// reassurance bar: this is policy text with legal weight, not UI copy, so it
// isn't run through an unreviewed translation.
const SHIPPING_AND_RETURNS_COPY = [
  "All Natlovers pieces are handcrafted to order. Typical production and delivery time is 1–3 weeks, occasionally longer for complex custom work or during high demand.",
  "As each item is handmade, we do not accept returns or exchanges on standard purchases. Custom and commissioned pieces cannot be returned once production has begun."
];

export function ProductInfoSection({product}: {product: AdminProduct}) {
  const hasMaterials = product.materials.length > 0;
  const dimensionsValue = product.dimensions ?? (product.size ? sizeLabels[product.size].en : null);
  const dimensionsLabel = product.dimensions ? "Dimensions" : "Size";

  return (
    <div className="mt-14 grid gap-8 rounded-xl border border-forest-100 bg-[#fffdf9] p-6 sm:p-8 lg:grid-cols-2 lg:gap-12">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-forest-800">Product Details</h2>
        {product.description?.trim() ? (
          // Re-sanitized here too (not just on write in lib/admin-products.ts)
          // as defense in depth  -  render-site sanitization stays correct even
          // if a row were ever written by some other path. white-space:
          // pre-wrap is kept so a pre-rich-text-editor plain-text description
          // (no markup, just line breaks) still renders exactly as before.
          <div
            className="prose-description whitespace-pre-wrap text-sm leading-relaxed text-forest-600"
            dangerouslySetInnerHTML={{__html: sanitizeDescriptionHtml(product.description)}}
          />
        ) : (
          <p className="text-sm leading-relaxed text-forest-600">No description provided yet.</p>
        )}
      </div>

      <div>
        {hasMaterials ? (
          <ProductAccordionRow title="Material & Care">
            <p>Materials: {product.materials.map((material) => materialLabels[material].en).join(", ")}.</p>
            <p className="mt-1.5 text-forest-500">Undyed natural fibre, handwoven. The material is the colour.</p>
          </ProductAccordionRow>
        ) : null}

        <ProductAccordionRow title="Shipping & Returns">
          {SHIPPING_AND_RETURNS_COPY.map((paragraph) => (
            <p key={paragraph} className="mt-1.5 first:mt-0">
              {paragraph}
            </p>
          ))}
        </ProductAccordionRow>

        {dimensionsValue ? <ProductAccordionRow title={dimensionsLabel}>{dimensionsValue}</ProductAccordionRow> : null}
      </div>
    </div>
  );
}
