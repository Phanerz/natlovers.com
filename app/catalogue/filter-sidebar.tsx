"use client";

import {useState} from "react";
import {ChevronUp, PanelLeftClose, SlidersHorizontal} from "lucide-react";
import {Locale} from "@/lib/site";
import {
  AccessoryCategory,
  ShopHandle,
  ShopMaterial,
  ShopProduct,
  ShopProductType,
  ShopShape,
  ShopSize,
  accessoryCategories,
  accessoryCategoryLabels,
  bagMaterials,
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
  selectedAccessoryCategories: AccessoryCategory[];
  onToggleMaterial: (value: ShopMaterial) => void;
  onToggleSize: (value: ShopSize) => void;
  onToggleShape: (value: ShopShape) => void;
  onToggleHandle: (value: ShopHandle) => void;
  onToggleAccessoryCategory: (value: AccessoryCategory) => void;
  onClearAll?: () => void;
  onCollapse?: () => void;
};

const copy = {
  en: {
    eyebrow: "Catalogue",
    tagline: "Handcrafted pieces, each with a story of its own.",
    filter: "Filter",
    clearAll: "Clear all",
    material: "Material",
    size: "Size",
    shape: "Shape",
    handle: "Handle",
    category: "Category",
    apparelComingSoon: "Our apparel collection is being handwoven right now. New pieces are coming soon."
  },
  id: {
    eyebrow: "Katalog",
    tagline: "Karya tangan, masing-masing dengan kisahnya sendiri.",
    filter: "Filter",
    clearAll: "Hapus semua",
    material: "Bahan",
    size: "Ukuran",
    shape: "Bentuk",
    handle: "Pegangan",
    category: "Kategori",
    apparelComingSoon: "Koleksi pakaian kami sedang ditenun. Karya baru akan segera hadir."
  }
};

// Counts are scoped to whichever product type is currently selected (passed
// in via `products`) so the numbers stay meaningful instead of always
// reflecting the whole catalogue.
function countBy<T extends string>(products: ShopProduct[], values: readonly T[], pick: (product: ShopProduct) => T | T[] | null) {
  const counts = {} as Record<T, number>;
  for (const value of values) {
    counts[value] = 0;
  }
  for (const product of products) {
    const picked = pick(product);
    if (picked === null) {
      continue;
    }
    const list = Array.isArray(picked) ? picked : [picked];
    for (const value of list) {
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return counts;
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

// Sections start closed (a compact index of Material / Size / Shape / Handle)
// unless something inside is already selected, and show how many selections
// they hold, so nothing active is ever hidden.
function FilterSection({title, activeCount = 0, children}: {title: string; activeCount?: number; children: React.ReactNode}) {
  const [open, setOpen] = useState(activeCount > 0);

  return (
    <div className="border-t border-[#e6dcc8] first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md py-3.5 text-left lg:py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#344332]/50"
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e2e28]">
          {title}
          {activeCount > 0 ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#344332] px-1 text-[10px] font-semibold tracking-normal text-[#f7f4ee]">
              {activeCount}
            </span>
          ) : null}
        </span>
        <ChevronUp
          className={`h-3.5 w-3.5 text-[#6b7a5f] transition-transform duration-300 ease-out ${open ? "" : "rotate-180"}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] pb-2 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function FilterRow({active, label, count, onClick}: {active: boolean; label: string; count: number; onClick: () => void}) {
  return (
    <label className="group flex cursor-pointer items-center justify-between gap-2 py-2.5 lg:py-[5px]">
      <span className="flex items-center gap-2.5">
        <input type="checkbox" checked={active} onChange={onClick} className="catalogue-filter-check" />
        <span className="text-[13px] text-[#3c3c34] transition-colors duration-150 group-hover:text-[#344332]">{label}</span>
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
  selectedAccessoryCategories,
  onToggleMaterial,
  onToggleSize,
  onToggleShape,
  onToggleHandle,
  onToggleAccessoryCategory,
  onClearAll,
  onCollapse
}: FilterSidebarProps) {
  const t = copy[locale];
  const activeTotal =
    selectedMaterials.length +
    selectedSizes.length +
    selectedShapes.length +
    selectedHandles.length +
    selectedAccessoryCategories.length;

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8a9a7c]">{t.eyebrow}</p>
        <h1 className="mt-1 font-display text-[clamp(30px,2.6vw,40px)] leading-none text-[#20241b]">
          {productTypeLabels[productType][locale]}
        </h1>
        <p className="mt-2 max-w-[24ch] font-display text-[14.5px] italic leading-snug text-[#6b6b5f]">{t.tagline}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
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
  );

  const filterBar = (
    <div className="mt-6 flex items-center justify-between border-b border-[#e6dcc8] pb-3">
      <span className="flex items-center gap-2 text-[13px] font-medium text-[#2e2e28]">
        <SlidersHorizontal className="h-3.5 w-3.5 text-[#6b7a5f]" />
        {t.filter}
      </span>
      {activeTotal > 0 && onClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-md text-[12px] text-[#6b6b5f] underline-offset-2 outline-none transition-colors hover:text-[#344332] hover:underline focus-visible:ring-2 focus-visible:ring-[#344332]/50"
        >
          {t.clearAll}
        </button>
      ) : null}
    </div>
  );

  if (productType === "Apparels") {
    return (
      <aside className="relative flex h-full w-full min-w-0 flex-col overflow-hidden">
        {header}
        <div className="mt-8 flex flex-1 items-center justify-center text-center">
          <p className="max-w-[22ch] text-sm leading-6 text-[#6b6b5f]">{t.apparelComingSoon}</p>
        </div>
        <SidebarVine />
      </aside>
    );
  }

  if (productType === "Accessories") {
    const categoryCounts = countBy(products, accessoryCategories, (product) => product.accessoryCategory);
    return (
      <aside className="relative w-full min-w-0 overflow-hidden">
        {header}
        {filterBar}
        <div>
          <FilterSection title={t.category} activeCount={selectedAccessoryCategories.length}>
            <div className="flex flex-col">
              {accessoryCategories.map((category) => (
                <FilterRow
                  key={category}
                  active={selectedAccessoryCategories.includes(category)}
                  label={accessoryCategoryLabels[category][locale]}
                  count={categoryCounts[category] ?? 0}
                  onClick={() => onToggleAccessoryCategory(category)}
                />
              ))}
            </div>
          </FilterSection>
        </div>
        <SidebarVine />
      </aside>
    );
  }

  if (productType === "Dolls") {
    const sizeCounts = countBy(products, shopSizes, (product) => product.size);
    return (
      <aside className="relative w-full min-w-0 overflow-hidden">
        {header}
        {filterBar}
        <div>
          <FilterSection title={t.size} activeCount={selectedSizes.length}>
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
        </div>
        <SidebarVine />
      </aside>
    );
  }

  // Bags.
  const materialCounts = countBy(products, bagMaterials, (product) => product.materials);
  const sizeCounts = countBy(products, shopSizes, (product) => product.size);
  const shapeCounts = countBy(products, shopShapes, (product) => product.shape);
  const handleCounts = countBy(products, shopHandles, (product) => product.handles);

  return (
    <aside className="relative w-full min-w-0 overflow-hidden">
      {header}
      {filterBar}
      <div>
        <FilterSection title={t.material} activeCount={selectedMaterials.length}>
          <div className="flex flex-col">
            {bagMaterials.map((material) => (
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

        <FilterSection title={t.size} activeCount={selectedSizes.length}>
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

        <FilterSection title={t.shape} activeCount={selectedShapes.length}>
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

        <FilterSection title={t.handle} activeCount={selectedHandles.length}>
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
      <SidebarVine />
    </aside>
  );
}
