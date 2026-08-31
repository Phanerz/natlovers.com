"use client";

import {useState} from "react";
import {ChevronDown} from "lucide-react";
import {ColourOptionsEditor} from "./colour-options-editor";
import {GlassToggle} from "./glass-toggle";
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
// actively chooses when buying (Base/Handle Colour, Personalisation),
// distinct from the Attributes card's fixed physical/taxonomic properties
// (Shape, Handle type, Materials, Body  -  see product-form.tsx's
// AttributeFields) that drive the catalogue's own filters. Body used to be
// Size and lived here, but a body is a fixed property of the listing, not a
// customer purchase choice, so it moved to Attributes. Each row below is
// independently optional per product.
export function ProductOptionsCard({
  form,
  onChange
}: {
  form: ProductFormState;
  onChange: (next: ProductFormState | ((prev: ProductFormState) => ProductFormState)) => void;
}) {
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const allRowKeys = ["base", "handle", "personalisation"];
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

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={toggleAllRows} className="text-xs font-semibold text-forest-700 hover:text-forest-900">
          {allOpen ? "Collapse options" : "Manage options"}
        </button>
      </div>

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
        summary={form.hasPersonalisation ? "On - customers can add a note" : "Off"}
        open={openRows.has("personalisation")}
        onToggle={() => toggleRow("personalisation")}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-forest-700">
            Let customers add a short personal note when they buy this product (e.g. a message or request).
          </span>
          <GlassToggle
            checked={form.hasPersonalisation}
            onChange={(checked) => onChange((prev) => ({...prev, hasPersonalisation: checked}))}
            label="Offer personalisation"
          />
        </div>
      </OptionRow>
    </div>
  );
}
