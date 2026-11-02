"use client";

import {ReactNode} from "react";
import {
  SKU_DESIGN_MAX_LENGTH,
  cleanRegistration,
  normalizeDesign,
  normalizeVariant,
  skuSegments
} from "@/lib/product-sku";
import type {AdminBodyShape} from "./body-shape-types";
import {ProductFormState, skuPartsFromForm} from "./types";

const autoCell =
  "flex h-9 min-w-9 items-center justify-center rounded-md bg-[#f1ead9] px-2 font-mono text-[15px] tracking-wider text-forest-700 select-none";
const pendingCell =
  "flex h-9 min-w-9 items-center justify-center rounded-md border border-dashed border-[#c9b98f] bg-[#fbf3dd] px-2 font-mono text-[15px] tracking-wider text-[#8a6d2f] select-none";
const inputCell =
  "h-9 rounded-md border border-[#d4c5ab] bg-white px-2 text-center font-mono text-[15px] uppercase tracking-wider text-forest-900 outline-none placeholder:text-forest-300 focus:border-forest-400 focus:ring-2 focus:ring-forest-400/30";

// One part of the code with its name printed underneath, so the structure is
// readable at a glance without a separate legend to decode.
function Part({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {children}
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-forest-400">{label}</span>
    </div>
  );
}

// Each piece travels with the dash in front of it, so when the code wraps on a
// narrow screen a dash never dangles at the end of a line.
function Unit({children}: {children: ReactNode}) {
  return (
    <div className="flex items-start gap-2">
      {dash}
      {children}
    </div>
  );
}

const dash = (
  <span className="flex h-9 select-none items-center font-mono text-forest-300" aria-hidden>
    -
  </span>
);

// Sections the admin never types into are rendered as plain, read-only text
// (not disabled inputs), so the generated parts can't be edited by accident.
export function SkuField({
  form,
  bodyShapes,
  onChange
}: {
  form: ProductFormState;
  bodyShapes: AdminBodyShape[];
  onChange: (updater: (prev: ProductFormState) => ProductFormState) => void;
}) {
  const segments = skuSegments(skuPartsFromForm(form, bodyShapes));
  const byKey = Object.fromEntries(segments.map((segment) => [segment.key, segment]));

  function readOnly(key: string, hint: string) {
    const segment = byKey[key];
    return (
      <Part label={segment.label}>
        <span className={segment.pending ? pendingCell : autoCell} title={`${segment.label}: ${hint}`}>
          {segment.value}
        </span>
      </Part>
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
          Saved code kept as-is; it doesn&apos;t follow the current structure or no longer matches this product&apos;s
          attributes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm text-forest-700">
      <span className="muted">SKU</span>
      <div className="flex flex-wrap items-start gap-x-2 gap-y-3 rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-4 pb-3 pt-3.5">
        {readOnly("brand", "brand identifier")}
        <Unit>{readOnly("category", "set automatically from the product category")}</Unit>
        <Unit>
          <Part label="Design">
            <input
              value={form.skuDesign}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  skuDesign: normalizeDesign(event.target.value),
                  skuDesignTouched: true
                }))
              }
              maxLength={SKU_DESIGN_MAX_LENGTH}
              placeholder="NATL"
              aria-label="SKU design abbreviation (up to 4 characters)"
              title="Design: abbreviation of the product name, up to 4 characters"
              className={`${inputCell} w-[4.75rem]`}
            />
          </Part>
        </Unit>
        <Unit>
          <div className="flex items-start gap-1.5">
            <Part label="Variant">
              <input
                value={form.skuVariant}
                onChange={(event) =>
                  onChange((prev) => ({
                    ...prev,
                    skuVariant: normalizeVariant(event.target.value)
                  }))
                }
                inputMode="numeric"
                maxLength={1}
                placeholder="1"
                aria-label="SKU variant digit"
                title="Variant: a single digit to tell versions of the same design apart"
                className={`${inputCell} w-10`}
              />
            </Part>
            {readOnly("material", "set automatically from the selected material")}
            {readOnly("shape", "set automatically from the selected shape")}
            {readOnly("size", "set automatically from the selected size")}
          </div>
        </Unit>
        <Unit>
          <Part label="Serial No.">
            <input
              value={form.skuRegistration}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  skuRegistration: cleanRegistration(event.target.value)
                }))
              }
              onFocus={(event) => event.target.select()}
              maxLength={4}
              placeholder="XXXX"
              aria-label="SKU serial number"
              title="Serial No.: XXXX until a real number is assigned"
              className={`${inputCell} w-[4.75rem]`}
            />
          </Part>
        </Unit>
      </div>
      <p className="text-xs leading-relaxed text-forest-500">
        Brand-Category-Design-Variant | Material | Shape | Size-Serial No. Shaded parts follow your selections; Design,
        Variant and Serial No. are yours to edit.
      </p>
    </div>
  );
}
