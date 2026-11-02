"use client";

import {SKU_DESIGN_MAX_LENGTH, cleanRegistration, normalizeDesign, normalizeVariant, skuSegments} from "@/lib/product-sku";
import {ProductFormState, skuPartsFromForm} from "./types";

const SKU_CAPTION = "Brand · Category · Design · Variant · Material · Size · Shape · Registration";

const autoCell =
  "rounded-md bg-[#f1ead9] px-2 py-1 font-mono text-[15px] tracking-wider text-forest-700 select-none";
const pendingCell = "rounded-md border border-dashed border-[#c9b98f] bg-[#fbf3dd] px-2 py-1 font-mono text-[15px] tracking-wider text-[#8a6d2f] select-none";
const inputCell =
  "rounded-md border border-[#d4c5ab] bg-white px-2 py-1 text-center font-mono text-[15px] uppercase tracking-wider text-forest-900 outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-400/30";

const separator = <span className="select-none font-mono text-forest-400" aria-hidden>-</span>;

// Sections the admin never types into are rendered as plain, read-only text
// (not disabled inputs), so the generated parts can't be edited by accident.
export function SkuField({
  form,
  onChange
}: {
  form: ProductFormState;
  onChange: (updater: (prev: ProductFormState) => ProductFormState) => void;
}) {
  const segments = skuSegments(skuPartsFromForm(form));
  const byKey = Object.fromEntries(segments.map((segment) => [segment.key, segment]));

  function readOnly(key: string, hint: string) {
    const segment = byKey[key];
    return (
      <span className={segment.pending ? pendingCell : autoCell} title={`${segment.label}: ${hint}`}>
        {segment.value}
      </span>
    );
  }

  if (form.skuLegacyCode) {
    return (
      <div className="space-y-2 text-sm text-forest-700">
        <span className="muted">SKU</span>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#d4c5ab] bg-[#f7f1e2] px-4 py-3">
          <span className="font-mono text-[15px] tracking-wider text-forest-900">{form.skuLegacyCode}</span>
          <button
            type="button"
            onClick={() => onChange((prev) => ({...prev, skuLegacyCode: null}))}
            className="glass-btn-secondary rounded-full px-3 py-1 text-xs font-medium text-forest-700"
          >
            Regenerate from attributes
          </button>
        </div>
        <p className="text-xs text-forest-500">
          Saved code kept as-is; it doesn&apos;t follow the current structure or no longer matches this product&apos;s attributes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm text-forest-700">
      <span className="muted">SKU</span>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-3 py-2.5">
        {readOnly("brand", "brand identifier")}
        {separator}
        {readOnly("category", "set automatically from the product category")}
        {separator}
        <input
          value={form.skuDesign}
          onChange={(event) =>
            onChange((prev) => ({...prev, skuDesign: normalizeDesign(event.target.value), skuDesignTouched: true}))
          }
          maxLength={SKU_DESIGN_MAX_LENGTH}
          placeholder="NDKC"
          aria-label="SKU design abbreviation (up to 4 characters)"
          title="Design: abbreviation of the product name, up to 4 characters"
          className={`${inputCell} w-[4.75rem]`}
        />
        {separator}
        <input
          value={form.skuVariant}
          onChange={(event) => onChange((prev) => ({...prev, skuVariant: normalizeVariant(event.target.value)}))}
          inputMode="numeric"
          maxLength={1}
          placeholder="1"
          aria-label="SKU variant digit"
          title="Variant: a single digit to tell versions of the same design apart"
          className={`${inputCell} w-9`}
        />
        {readOnly("material", "set automatically from the selected material")}
        {readOnly("size", "set automatically from the selected size")}
        {readOnly("shape", "set automatically from the selected shape")}
        {separator}
        <input
          value={form.skuRegistration}
          onChange={(event) => onChange((prev) => ({...prev, skuRegistration: cleanRegistration(event.target.value)}))}
          onFocus={(event) => event.target.select()}
          maxLength={4}
          placeholder="XXXX"
          aria-label="SKU registration number"
          title="Registration: XXXX until a real number is assigned"
          className={`${inputCell} w-[4.75rem]`}
        />
      </div>
      <p className="text-xs text-forest-500">{SKU_CAPTION}</p>
    </div>
  );
}
