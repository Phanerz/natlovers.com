import {materialLabels, sizeLabels} from "@/app/catalogue/shop-data";
import {ProductAccordionRow} from "@/components/product/product-accordion-row";
import type {AdminProduct} from "@/lib/admin-products";

// Real, confirmed store policy — English only, same reasoning as the
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
    <div className="mt-14 grid gap-8 rounded-[1.6rem] border border-forest-100 bg-[#fffdf9] p-6 sm:p-8 lg:grid-cols-2 lg:gap-12">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-forest-800">Description</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-forest-600">
          {product.description?.trim() || "No description provided yet."}
        </p>
      </div>

      <div>
        {hasMaterials ? (
          <ProductAccordionRow title="Material & Care">
            <p>Materials: {product.materials.map((material) => materialLabels[material].en).join(", ")}.</p>
            <p className="mt-1.5 text-forest-500">Undyed natural fibre, handwoven — the material is the colour.</p>
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
