import type {LucideIcon} from "lucide-react";
import {Grip, Info, Layers, PackageCheck, PackageX, Ruler, Shapes, Sparkles, Tag} from "lucide-react";
import {accessoryCategoryLabels, handleLabels, materialLabels, shapeLabels, sizeLabels} from "@/app/catalogue/shop-data";
import type {AdminProduct} from "@/lib/admin-products";
import {formatBodyShapeDimensions} from "@/lib/body-shapes";
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

  const sizeLabel = product.size ? sizeLabels[product.size][locale] : null;
  const dimensionsValue = product.dimensions ?? (product.bodyShape ? formatBodyShapeDimensions(product.bodyShape) : null);
  if (sizeLabel && dimensionsValue) {
    rows.push({key: "size", icon: Ruler, label: "Size", value: `${sizeLabel} — ${dimensionsValue}`});
  } else if (sizeLabel) {
    rows.push({key: "size", icon: Ruler, label: "Size", value: sizeLabel});
  } else if (dimensionsValue) {
    rows.push({key: "dimensions", icon: Ruler, label: "Dimensions", value: dimensionsValue});
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

  if (product.handle) {
    rows.push({key: "handle", icon: Grip, label: "Handle Type", value: handleLabels[product.handle][locale]});
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
    <div className="card mt-5 divide-y divide-forest-100 px-5 py-1 sm:px-6">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <span className="flex items-center gap-2.5 text-sm font-medium uppercase tracking-[0.08em] text-forest-500">
            <row.icon className="h-4 w-4 shrink-0 text-forest-500" aria-hidden />
            {row.label}
          </span>
          <span className="text-base font-semibold text-forest-900 sm:text-right sm:text-[17px]">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
