"use client";

import {useState} from "react";
import {ChevronUp, PanelLeftClose} from "lucide-react";
import {Locale} from "@/lib/site";
import {
  AccessoryCategory,
  ShopGender,
  ShopHandle,
  ShopMaterial,
  ShopProduct,
  ShopProductType,
  ShopShape,
  ShopSize,
  accessoryCategories,
  accessoryCategoryLabels,
  bagMaterials,
  dollMaterials,
  genderLabels,
  handleLabels,
  materialLabels,
  productTypeLabels,
  shapeLabels,
  shopGenders,
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
  selectedGenders: ShopGender[];
  selectedAccessoryCategories: AccessoryCategory[];
  onToggleMaterial: (value: ShopMaterial) => void;
  onToggleSize: (value: ShopSize) => void;
  onToggleShape: (value: ShopShape) => void;
  onToggleHandle: (value: ShopHandle) => void;
  onToggleGender: (value: ShopGender) => void;
  onToggleAccessoryCategory: (value: AccessoryCategory) => void;
  onCollapse?: () => void;
};

const copy = {
  en: {
    material: "Material",
    size: "Size",
    shape: "Shape",
    handle: "Handle",
    gender: "Gender",
    category: "Category",
    apparelComingSoon: "Our apparel collection is being handwoven right now. New pieces are coming soon."
  },
  id: {
    material: "Bahan",
    size: "Ukuran",
    shape: "Bentuk",
    handle: "Pegangan",
    gender: "Jenis Kelamin",
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

function FilterSection({title, children}: {title: string; children: React.ReactNode}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-[#d9cfc0] pb-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left transition-transform duration-200 active:scale-[0.98]"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e2e28]">{title}</span>
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

function FilterRow({active, label, count, onClick}: {active: boolean; label: string; count: number; onClick: () => void}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1 group">
      <span className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={active}
          onChange={onClick}
          className="h-[15px] w-[15px] shrink-0 cursor-pointer rounded-[3px] border border-[#c9bfa8] accent-[#344332]"
        />
        <span className="text-[13.5px] text-[#3c3c34] transition-colors duration-150 group-hover:text-[#344332]">{label}</span>
      </span>
      <span className="text-[12px] text-[#a39d8d]">{count}</span>
    </label>
  );
}

// Symbol-only per spec — no visible text label next to ♂/♀, so the
// aria-label is the only thing that names the option for anyone not
// reading it visually.
function GenderToggle({
  value,
  active,
  onClick
}: {
  value: ShopGender;
  active: boolean;
  onClick: () => void;
}) {
  const isMale = value === "Male";
  const symbol = isMale ? "♂" : "♀";
  const colorClasses = isMale
    ? active
      ? "border-[#3a6ea5] bg-[#3a6ea5] text-white"
      : "border-[#bcd2e6] bg-[#eaf1f8] text-[#3a6ea5]"
    : active
      ? "border-[#c9598f] bg-[#c9598f] text-white"
      : "border-[#f0c9dc] bg-[#fbeef4] text-[#c9598f]";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={isMale ? "Male" : "Female"}
      className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl font-semibold transition-all duration-150 active:scale-95 ${colorClasses}`}
    >
      {symbol}
    </button>
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
  selectedGenders,
  selectedAccessoryCategories,
  onToggleMaterial,
  onToggleSize,
  onToggleShape,
  onToggleHandle,
  onToggleGender,
  onToggleAccessoryCategory,
  onCollapse
}: FilterSidebarProps) {
  const t = copy[locale];

  const header = (
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
        <div className="mt-4">
          <FilterSection title={t.category}>
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
    const materialCounts = countBy(products, dollMaterials, (product) => product.materials);
    return (
      <aside className="relative w-full min-w-0 overflow-hidden">
        {header}
        <div className="mt-4 space-y-3">
          <div className="border-b border-[#d9cfc0] pb-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e2e28]">{t.gender}</span>
            <div className="mt-2 flex gap-2">
              {shopGenders.map((gender) => (
                <GenderToggle
                  key={gender}
                  value={gender}
                  active={selectedGenders.includes(gender)}
                  onClick={() => onToggleGender(gender)}
                />
              ))}
            </div>
          </div>

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

          <FilterSection title={t.material}>
            <div className="flex flex-col">
              {dollMaterials.map((material) => (
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
        </div>
        <SidebarVine />
      </aside>
    );
  }

  // Bags.
  const materialCounts = countBy(products, bagMaterials, (product) => product.materials);
  const sizeCounts = countBy(products, shopSizes, (product) => product.size);
  const shapeCounts = countBy(products, shopShapes, (product) => product.shape);
  const handleCounts = countBy(products, shopHandles, (product) => product.handle);

  return (
    <aside className="relative w-full min-w-0 overflow-hidden">
      {header}
      <div className="mt-4 space-y-3">
        <FilterSection title={t.material}>
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
      <SidebarVine />
    </aside>
  );
}
