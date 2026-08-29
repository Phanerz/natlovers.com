"use client";

import {useState} from "react";
import {ChevronDown} from "lucide-react";
import {ShopSize, shopSizes, sizeLabels} from "@/app/catalogue/shop-data";
import {resolveSizeDimensions, formatSizeDimensions} from "@/lib/size-dimensions";
import {ColourOptionsEditor} from "./colour-options-editor";
import {GlassToggle} from "./glass-toggle";
import {PersonalisationOptionsEditor} from "./personalisation-options-editor";
import {ProductFormState} from "./types";

function OptionRow({
  label,
  badge,
  summary,
  open,
  onToggle,
  children
}: {
  label: string;
  badge: "Required" | "Optional";
  summary: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#d4c5ab] bg-[#fffdf9]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-forest-900">{label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            badge === "Required" ? "bg-[#eee1c4] text-forest-800" : "bg-forest-100 text-forest-600"
          }`}
        >
          {badge}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-forest-500">{summary}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-forest-500 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="border-t border-[#e4d9c1] p-4">{children}</div> : null}
    </div>
  );
}

// The reference's "Product Options (Customisation)" card: what a customer
// actively chooses when buying (Size, Base/Handle Colour, Personalisation),
// distinct from the Attributes card's fixed physical/taxonomic properties
// (Shape, Handle type, Materials) that drive the catalogue's own filters.
// Size stays required whenever the product type shows it at all (Bags,
// Dolls  -  see attributesForType in lib/admin-products.ts); the other three
// are each independently optional per product.
export function ProductOptionsCard({
  form,
  onChange
}: {
  form: ProductFormState;
  onChange: (next: ProductFormState | ((prev: ProductFormState) => ProductFormState)) => void;
}) {
  const showSize = form.productType === "Bags" || form.productType === "Dolls";
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const allRowKeys = [showSize ? "size" : null, "base", "handle", "personalisation"].filter(
    (key): key is string => key !== null
  );
  const allOpen = allRowKeys.every((key) => openRows.has(key));

  function toggleRow(key: string) {
    setOpenRows((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleAllRows() {
    setOpenRows(allOpen ? new Set() : new Set(allRowKeys));
  }

  function updateSizeDimension(size: ShopSize, field: "L" | "W" | "H", value: number) {
    onChange((prev) => {
      const current = resolveSizeDimensions(size, prev.sizeDimensions);
      return {...prev, sizeDimensions: {...prev.sizeDimensions, [size]: {...current, [field]: value}}};
    });
  }

  function updateSizePriceDelta(size: ShopSize, value: number) {
    onChange((prev) => ({...prev, sizePriceDeltaIdr: {...prev.sizePriceDeltaIdr, [size]: value}}));
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={toggleAllRows} className="text-xs font-semibold text-forest-700 hover:text-forest-900">
          {allOpen ? "Collapse options" : "Manage options"}
        </button>
      </div>

      {showSize ? (
        <OptionRow
          label="Size"
          badge="Required"
          summary={`${sizeLabels[form.size].en}: ${formatSizeDimensions(form.size, form.sizeDimensions)}`}
          open={openRows.has("size")}
          onToggle={() => toggleRow("size")}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {shopSizes.map((option) => {
              const dims = resolveSizeDimensions(option, form.sizeDimensions);
              const delta = form.sizePriceDeltaIdr[option] ?? 0;
              const active = option === form.size;
              return (
                <div
                  key={option}
                  className={`rounded-lg border p-3 transition-colors duration-150 ${
                    active ? "border-forest-700 bg-white" : "border-[#ddd5c4] bg-[#fffdf9]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({...prev, size: option}))}
                    aria-pressed={active}
                    className="mb-2 flex w-full items-center justify-between text-left"
                  >
                    <span className="text-sm font-semibold text-forest-900">{sizeLabels[option].en}</span>
                    <span className={`text-[10px] font-semibold uppercase ${active ? "text-forest-700" : "text-forest-400"}`}>
                      {active ? "Default" : "Set as default"}
                    </span>
                  </button>

                  <div className="grid grid-cols-3 gap-1.5">
                    {(["L", "W", "H"] as const).map((field) => (
                      <label key={field} className="block">
                        <span className="mb-0.5 block text-[10px] font-semibold uppercase text-forest-500">{field} (cm)</span>
                        <input
                          type="number"
                          min={0}
                          value={dims[field]}
                          onChange={(event) => updateSizeDimension(option, field, Number(event.target.value) || 0)}
                          className="w-full rounded-md border border-[#d4c5ab] bg-white px-2 py-1.5 text-sm text-forest-900 outline-none focus:border-forest-400"
                        />
                      </label>
                    ))}
                  </div>

                  <label className="mt-1.5 block">
                    <span className="mb-0.5 block text-[10px] font-semibold uppercase text-forest-500">Price delta (IDR)</span>
                    <input
                      type="number"
                      value={delta}
                      onChange={(event) => updateSizePriceDelta(option, Number(event.target.value) || 0)}
                      placeholder="0"
                      className="w-full rounded-md border border-[#d4c5ab] bg-white px-2 py-1.5 text-sm text-forest-900 outline-none focus:border-forest-400"
                    />
                  </label>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-forest-500">
            Price deltas default to 0, so size never changes the total until real figures are entered here.
          </p>

          <label className="mt-3 block">
            <span className="muted">Dimensions override (optional)</span>
            <input
              value={form.dimensions}
              onChange={(event) => onChange((prev) => ({...prev, dimensions: event.target.value}))}
              placeholder="e.g. Approx. 30 x 20 x 15 cm  -  for irregular pieces the L/W/H fields above can't express"
              className="mt-1.5 w-full rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-3.5 py-2.5 text-sm text-forest-900 outline-none focus:border-forest-400"
            />
          </label>
        </OptionRow>
      ) : null}

      <OptionRow
        label="Base Colour"
        badge="Optional"
        summary={
          form.hasBaseColour
            ? form.baseColourOptions.map((option) => option.label).join(", ") || "No colours added yet"
            : "Off"
        }
        open={openRows.has("base")}
        onToggle={() => toggleRow("base")}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-forest-700">Offer a base colour choice for this product</span>
          <GlassToggle
            checked={form.hasBaseColour}
            onChange={(checked) => onChange((prev) => ({...prev, hasBaseColour: checked}))}
            label="Offer a base colour choice"
          />
        </div>
        {form.hasBaseColour ? (
          <ColourOptionsEditor
            label="Base colour"
            options={form.baseColourOptions}
            onChange={(baseColourOptions) => onChange((prev) => ({...prev, baseColourOptions}))}
          />
        ) : null}
      </OptionRow>

      <OptionRow
        label="Handle Colour"
        badge="Optional"
        summary={
          form.hasHandleColour
            ? form.handleColourOptions.map((option) => option.label).join(", ") || "No colours added yet"
            : "Off"
        }
        open={openRows.has("handle")}
        onToggle={() => toggleRow("handle")}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-forest-700">Offer a handle colour choice for this product</span>
          <GlassToggle
            checked={form.hasHandleColour}
            onChange={(checked) => onChange((prev) => ({...prev, hasHandleColour: checked}))}
            label="Offer a handle colour choice"
          />
        </div>
        {form.hasHandleColour ? (
          <ColourOptionsEditor
            label="Handle colour"
            options={form.handleColourOptions}
            onChange={(handleColourOptions) => onChange((prev) => ({...prev, handleColourOptions}))}
          />
        ) : null}
      </OptionRow>

      <OptionRow
        label="Personalisation"
        badge="Optional"
        summary={form.hasPersonalisation ? form.personalisationOptions.join(" • ") || "No options added yet" : "Off"}
        open={openRows.has("personalisation")}
        onToggle={() => toggleRow("personalisation")}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-forest-700">Offer personalisation for this product</span>
          <GlassToggle
            checked={form.hasPersonalisation}
            onChange={(checked) => onChange((prev) => ({...prev, hasPersonalisation: checked}))}
            label="Offer personalisation"
          />
        </div>
        {form.hasPersonalisation ? (
          <PersonalisationOptionsEditor
            options={form.personalisationOptions}
            onChange={(personalisationOptions) => onChange((prev) => ({...prev, personalisationOptions}))}
          />
        ) : null}
      </OptionRow>
    </div>
  );
}
