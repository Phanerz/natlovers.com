"use client";

import {useState} from "react";
import {ChevronUp, PanelLeftClose, RotateCcw} from "lucide-react";
import {Locale} from "@/lib/site";
import {
  ShopHandle,
  ShopMaterial,
  ShopProduct,
  ShopProductType,
  ShopShape,
  ShopSize,
  getSortedMaterials,
  handleLabels,
  materialLabels,
  productTypeLabels,
  shapeLabels,
  shopHandles,
  shopShapes,
  shopSizes,
  sizeLabels
} from "./shop-data";

type FilterSidebarProps = {
  locale: Locale;
  productType: ShopProductType;
  products: ShopProduct[];
  selectedMaterials: ShopMaterial[];
  selectedSizes: ShopSize[];
  selectedShapes: ShopShape[];
  selectedHandles: ShopHandle[];
  onToggleMaterial: (value: ShopMaterial) => void;
  onToggleSize: (value: ShopSize) => void;
  onToggleShape: (value: ShopShape) => void;
  onToggleHandle: (value: ShopHandle) => void;
  onClearAll: () => void;
  onCollapse?: () => void;
};

const copy = {
  en: {clearAll: "Clear All Filters", material: "Material", size: "Size", shape: "Shape", handle: "Handle"},
  id: {
    clearAll: "Hapus Semua Filter",
    material: "Bahan",
    size: "Ukuran",
    shape: "Bentuk",
    handle: "Pegangan"
  }
};

// Counts are scoped to whichever product type is currently selected (passed
// in via `products`) so switching between Bags/Dolls/Accessories/Apparels
// keeps the numbers meaningful instead of always reflecting the whole
// catalogue.
function countBy<T extends string>(products: ShopProduct[], values: T[], pick: (product: ShopProduct) => T | T[]) {
  const counts = {} as Record<T, number>;
  for (const value of values) {
    counts[value] = 0;
  }
  for (const product of products) {
    const picked = pick(product);
    const list = Array.isArray(picked) ? picked : [picked];
    for (const value of list) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return counts;
}

function SidebarSprig() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-12 w-12 shrink-0 text-[#8a9a7c]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M32 58 C30 44 34 30 30 14" />
      <path d="M30 14 C24 16 18 14 14 8" />
      <path d="M30 14 C36 12 40 6 40 2" />
      <path d="M31 30 C25 30 20 26 18 22" />
      <path d="M31 30 C37 28 41 24 42 20" />
      <path d="M31 44 C26 45 22 42 20 38" />
      <path d="M31 44 C36 43 40 40 41 36" />
    </svg>
  );
}

function SidebarVine() {
  return (
    <svg
      viewBox="0 0 140 100"
      className="pointer-events-none absolute -bottom-3 -left-3 h-24 w-32 text-[#8a9a7c] opacity-[0.28]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <path d="M4 96 C30 80 20 50 46 40" />
      <path d="M46 40 C50 32 46 22 52 14" />
      <path d="M46 40 C40 34 38 26 30 22" />
      <path d="M30 60 C24 58 20 52 22 46" />
      <path d="M30 60 C34 64 40 64 44 60" />
      <path d="M14 80 C10 76 10 70 14 66" />
    </svg>
  );
}

function FilterSection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-[#d9cfc0] pb-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left transition-transform duration-200 active:scale-[0.98]"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e2e28]">
          {title}
        </span>
        <ChevronUp
          className={`h-3.5 w-3.5 text-[#344332] transition-transform duration-300 ease-out ${open ? "" : "rotate-180"}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "mt-1.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function FilterRow({
  active,
  label,
  count,
  onClick
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1 group">
      <span className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={active}
          onChange={onClick}
          className="h-[15px] w-[15px] shrink-0 cursor-pointer rounded-[3px] border border-[#c9bfa8] accent-[#344332]"
        />
        <span className="text-[13.5px] text-[#3c3c34] transition-colors duration-150 group-hover:text-[#344332]">
          {label}
        </span>
      </span>
      <span className="text-[12px] text-[#a39d8d]">{count}</span>
    </label>
  );
}

export function FilterSidebar({
  locale,
  productType,
  products,
  selectedMaterials,
  selectedSizes,
  selectedShapes,
  selectedHandles,
  onToggleMaterial,
  onToggleSize,
  onToggleShape,
  onToggleHandle,
  onClearAll,
  onCollapse
}: FilterSidebarProps) {
  const t = copy[locale];
  const sortedMaterials = getSortedMaterials(locale);
  const materialCounts = countBy(products, sortedMaterials, (product) => product.materials);
  const sizeCounts = countBy(products, shopSizes, (product) => product.size);
  const shapeCounts = countBy(products, shopShapes, (product) => product.shape);
  const handleCounts = countBy(products, shopHandles, (product) => product.handle);

  return (
    <aside className="relative w-full min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-[26px] uppercase tracking-[0.08em] text-[#2e2e28]">
          {productTypeLabels[productType][locale]}
        </h1>
        <div className="flex items-center gap-1">
          <SidebarSprig />
          {onCollapse ? (
            <button
              type="button"
              aria-label="Hide filters"
              onClick={onCollapse}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#a39d8d] transition-all duration-200 hover:bg-[#eee7d8] hover:text-[#344332] active:scale-90"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <FilterSection title={t.material}>
          <div className="flex flex-col">
            {sortedMaterials.map((material) => (
              <FilterRow
                key={material}
                active={selectedMaterials.includes(material)}
                label={materialLabels[material][locale]}
                count={materialCounts[material] ?? 0}
                onClick={() => onToggleMaterial(material)}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t.size}>
          <div className="flex flex-col">
            {shopSizes.map((size) => (
              <FilterRow
                key={size}
                active={selectedSizes.includes(size)}
                label={sizeLabels[size][locale]}
                count={sizeCounts[size] ?? 0}
                onClick={() => onToggleSize(size)}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t.shape}>
          <div className="flex flex-col">
            {shopShapes.map((shape) => (
              <FilterRow
                key={shape}
                active={selectedShapes.includes(shape)}
                label={shapeLabels[shape][locale]}
                count={shapeCounts[shape] ?? 0}
                onClick={() => onToggleShape(shape)}
              />
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t.handle}>
          <div className="flex flex-col">
            {shopHandles.map((handle) => (
              <FilterRow
                key={handle}
                active={selectedHandles.includes(handle)}
                label={handleLabels[handle][locale]}
                count={handleCounts[handle] ?? 0}
                onClick={() => onToggleHandle(handle)}
              />
            ))}
          </div>
        </FilterSection>
      </div>

      <button
        type="button"
        onClick={onClearAll}
        className="mt-5 flex w-full items-center justify-between rounded-full border border-[#d9cfc0] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4a4a3f] transition-all duration-200 hover:border-[#344332] hover:bg-[#eee7d8] active:scale-[0.98]"
      >
        {t.clearAll}
        <RotateCcw className="h-3.5 w-3.5" />
      </button>

      <SidebarVine />
    </aside>
  );
}
