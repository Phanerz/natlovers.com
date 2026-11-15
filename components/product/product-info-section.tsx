import type {ReactNode} from "react";
import type {AdminProduct} from "@/lib/admin-products";
import {sanitizeDescriptionHtml} from "@/lib/sanitize-html";

// Below the fold: the story of the piece on the left, and  -  when the piece offers it  -  personalisation on the
// right, in the same two columns as the gallery and buying column above. A
// piece with nothing to personalise gives the story the full width.
export function ProductInfoSection({product, customiser}: {product: AdminProduct; customiser?: ReactNode}) {
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

      </div>

      {customiser ? <div className="min-w-0">{customiser}</div> : null}
    </div>
  );
}
