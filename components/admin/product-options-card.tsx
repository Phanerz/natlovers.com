"use client";

import {useState} from "react";
import {ChevronDown} from "lucide-react";
import {ShopSize, shopSizes, sizeLabels} from "@/app/catalogue/shop-data";
import {resolveSizeDimensions, formatSizeDimensions} from "@/lib/size-dimensions";
import {ColourOptionsEditor} from "./colour-options-editor";
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

function ToggleSwitch({checked, onChange}: {checked: boolean; onChange: (checked: boolean) => void}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ${checked ? "bg-forest-700" : "bg-[#d9cfc0]"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-150 ${
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
        }`}
      />
    </button>
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
  const [openRow, setOpenRow] = useState<string | null>(null);

  function toggleRow(key: string) {
    setOpenRow((current) => (current === key ? null : key));
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
      {showSize ? (
        <OptionRow
          label="Size"
          badge="Required"
          summary={`${sizeLabels[form.size].en}: ${formatSizeDimensions(form.size, form.sizeDimensions)}`}
          open={openRow === "size"}
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
        open={openRow === "base"}
        onToggle={() => toggleRow("base")}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-forest-700">Offer a base colour choice for this product</span>
          <ToggleSwitch checked={form.hasBaseColour} onChange={(checked) => onChange((prev) => ({...prev, hasBaseColour: checked}))} />
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
        open={openRow === "handle"}
        onToggle={() => toggleRow("handle")}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-forest-700">Offer a handle colour choice for this product</span>
          <ToggleSwitch
            checked={form.hasHandleColour}
            onChange={(checked) => onChange((prev) => ({...prev, hasHandleColour: checked}))}
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
        open={openRow === "personalisation"}
        onToggle={() => toggleRow("personalisation")}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-forest-700">Offer personalisation for this product</span>
          <ToggleSwitch
            checked={form.hasPersonalisation}
            onChange={(checked) => onChange((prev) => ({...prev, hasPersonalisation: checked}))}
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
