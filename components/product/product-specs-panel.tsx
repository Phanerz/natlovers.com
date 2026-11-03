import type {LucideIcon} from "lucide-react";
import {Grip, Info, Layers, PackageCheck, PackageX, Ruler, Shapes, Sparkles, Tag} from "lucide-react";
import {accessoryCategoryLabels, handleLabels, materialLabels, shapeLabels, sizeLabels} from "@/app/catalogue/shop-data";
import type {AdminProduct} from "@/lib/admin-products";
import {summarizeBodyShapeDimensions} from "@/lib/body-shapes";
import type {Locale} from "@/lib/site";

type SpecRow = {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

// Every fact a customer would actually weigh before buying, in the order
// they'd weigh it: can I have it, then what is it (size before the finer
// material/shape/handle detail), then the reference code last. Replaces the
// old single "N in stock" line under the Add to Bag button - that fact now
// lives here, first, instead of off on its own.
export function ProductSpecsPanel({
  product,
  outOfStock,
  stockLabel,
  locale
}: {
  product: AdminProduct;
  outOfStock: boolean;
  stockLabel: string;
  locale: Locale;
}) {
  const rows: SpecRow[] = [];

  // Not tracked isn't the same claim as confirmed in stock, so it gets its
  // own neutral icon rather than borrowing the affirmative PackageCheck.
  const availabilityIcon = outOfStock ? PackageX : product.stock === null ? Info : PackageCheck;
  rows.push({key: "availability", icon: availabilityIcon, label: "Availability", value: stockLabel});

  // The admin's free-text override (already short, e.g. "Approx. 30 x 20 x
  // 15 cm") can't be compacted further; a real assigned body gets the
  // short Ø/x form instead of the verbose "Width: … Height: …" one used
  // in the Dimensions accordion elsewhere on this page.
  const sizeLabel = product.size ? sizeLabels[product.size][locale] : null;
  const rawDimensions = product.dimensions ?? (product.bodyShape ? summarizeBodyShapeDimensions(product.bodyShape) : null);
  const compactDimensions = rawDimensions && rawDimensions !== "—" ? rawDimensions : null;
  if (sizeLabel && compactDimensions) {
    rows.push({key: "size", icon: Ruler, label: "Size", value: `${sizeLabel} (${compactDimensions})`});
  } else if (sizeLabel) {
    rows.push({key: "size", icon: Ruler, label: "Size", value: sizeLabel});
  } else if (compactDimensions) {
    rows.push({key: "dimensions", icon: Ruler, label: "Dimensions", value: compactDimensions});
  }

  if (product.materials.length > 0) {
    rows.push({
      key: "material",
      icon: Layers,
      label: product.materials.length > 1 ? "Materials" : "Material",
      value: product.materials.map((material) => materialLabels[material][locale]).join(", ")
    });
  }

  if (product.shape) {
    rows.push({key: "shape", icon: Shapes, label: "Shape", value: shapeLabels[product.shape][locale]});
  }

  if (product.handles.length > 0) {
    rows.push({
      key: "handle",
      icon: Grip,
      label: product.handles.length > 1 ? "Handle Types" : "Handle Type",
      value: product.handles.map((handle) => handleLabels[handle][locale]).join(", ")
    });
  }

  if (product.accessoryCategory) {
    rows.push({
      key: "category",
      icon: Sparkles,
      label: "Category",
      value: accessoryCategoryLabels[product.accessoryCategory][locale]
    });
  }

  if (product.productCode) {
    rows.push({key: "code", icon: Tag, label: "Product Code", value: product.productCode});
  }

  return (
    <dl className="pdp-specs">
      {rows.map((row) => (
        <div key={row.key} className="pdp-spec-row">
          <dt className="pdp-spec-label">
            <span className="pdp-spec-icon">
              <row.icon className="h-4 w-4" aria-hidden />
            </span>
            {row.label}
          </dt>
          <dd className="pdp-spec-value">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
