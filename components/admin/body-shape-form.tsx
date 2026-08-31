"use client";

import {FormEvent} from "react";
import {GlassToggle} from "./glass-toggle";
import {BodyShapeFormState} from "./body-shape-types";

const fieldClass =
  "w-full rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3 text-base text-forest-900 outline-none focus:border-forest-400";

const numberFieldClass =
  "w-full rounded-md border border-[#d4c5ab] bg-white px-3 py-2 text-sm text-forest-900 outline-none focus:border-forest-400";

function NumberField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-forest-500">{label}</span>
      <input
        type="number"
        min={0}
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={numberFieldClass}
      />
    </label>
  );
}

export function BodyShapeForm({
  mode,
  form,
  onChange,
  onSubmit,
  submitting,
  errorMessage,
  onCancel
}: {
  mode: "create" | "edit";
  form: BodyShapeFormState;
  onChange: (next: BodyShapeFormState) => void;
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  errorMessage: string | null;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="card space-y-6 p-6 sm:p-8">
      <label className="block space-y-2 text-sm text-forest-700">
        <span className="muted">Name</span>
        <input
          value={form.name}
          onChange={(event) => onChange({...form, name: event.target.value})}
          required
          placeholder='e.g. "Oval Mdg INBB", "Cowak L", "Palit kotak tebal"'
          className={fieldClass}
        />
      </label>

      <div className="space-y-3">
        <span className="muted">Shape type</span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              {value: "box", label: "Box (width x height x depth)"},
              {value: "round", label: "Round (diameter + thickness)"}
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({...form, shapeType: option.value})}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                form.shapeType === option.value
                  ? "bg-forest-900 text-sand-50"
                  : "border border-[#d4c5ab] bg-[#fffaf1] text-forest-700 hover:bg-[#f0e7d4]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {form.shapeType === "box" ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <NumberField label="Width (cm)" value={form.widthCm} onChange={(value) => onChange({...form, widthCm: value})} />
          <NumberField
            label="Width at bottom (cm, optional)"
            value={form.widthBottomCm}
            onChange={(value) => onChange({...form, widthBottomCm: value})}
            placeholder="For a tapered body"
          />
          <NumberField label="Height (cm)" value={form.heightCm} onChange={(value) => onChange({...form, heightCm: value})} />
          <NumberField label="Depth (cm)" value={form.depthCm} onChange={(value) => onChange({...form, depthCm: value})} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField
            label="Diameter (cm)"
            value={form.diameterCm}
            onChange={(value) => onChange({...form, diameterCm: value})}
          />
          <NumberField
            label="Height (cm, optional)"
            value={form.heightCm}
            onChange={(value) => onChange({...form, heightCm: value})}
            placeholder="For a tall body, e.g. Bumbung"
          />
          <NumberField
            label="Thickness (cm)"
            value={form.thicknessCm}
            onChange={(value) => onChange({...form, thicknessCm: value})}
          />
        </div>
      )}
      <p className="text-xs text-forest-500">
        Leave any measurement blank if it isn&apos;t known yet  -  a body can be added to the catalog before it&apos;s measured.
      </p>

      <div className="flex items-center justify-between rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-forest-900">In stock</p>
          <p className="text-xs text-forest-500">Turn off when the workshop is out of this body ("body habis").</p>
        </div>
        <GlassToggle checked={form.inStock} onChange={(checked) => onChange({...form, inStock: checked})} label="In stock" />
      </div>

      <label className="block space-y-2 text-sm text-forest-700">
        <span className="muted">Notes (optional)</span>
        <input
          value={form.notes}
          onChange={(event) => onChange({...form, notes: event.target.value})}
          placeholder='e.g. "Comes in 3 sizes: L/M/S" or "Available in multiple colours"'
          className={fieldClass}
        />
      </label>

      {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="glass-btn-primary flex-1 rounded-full px-6 py-4 text-base font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving..." : mode === "create" ? "Add body" : "Save changes"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#cdbfa6] bg-[#fffaf1] px-6 py-4 text-base font-medium text-forest-700"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
