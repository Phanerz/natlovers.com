"use client";

import {Check} from "lucide-react";
import {
  activeBagColours,
  customApparelGarments,
  customApparelPlacements,
  customApparelSizes,
  customBagShapes,
  customBagSizes,
  customDollSubjects,
  dollSubjectLabels,
  type CustomConfig
} from "@/lib/custom-studio";

// Step 1 of the studio. One panel per product type, because each category
// owns a genuinely different schema  -  a doll has no garment and a bag has no
// placement, and a single generic form would have to pretend otherwise.
//
// Nothing in here carries its own number. The studio has exactly one
// numbering system (1 Design → 2 Inspiration → 3 Details → 4 Review) and it
// lives on the step headers; numbering the fields inside step 1 as well gave
// the page two competing sequences that disagreed with each other.

export function FieldLabel({children, hint}: {children: React.ReactNode; hint?: string}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forest-500">{children}</p>
      {hint ? <span className="text-[10px] text-forest-400">{hint}</span> : null}
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  label,
  children
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex flex-col items-center justify-end gap-1 rounded-xl border px-2 py-2 text-center transition-all duration-200 ${
        selected
          ? "border-forest-700 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
          : "border-[#ddd5c4] bg-[#fffdf9] hover:border-forest-400 hover:bg-white"
      }`}
    >
      {selected ? (
        <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-forest-700 text-sand-50">
          <Check className="h-2 w-2" />
        </span>
      ) : null}
      {children}
      <span className="text-[10.5px] font-medium leading-tight text-forest-800">{label}</span>
    </button>
  );
}

// Abstract line art rather than a stand-in photograph  -  a diagram cannot be
// mistaken for a picture of the finished piece, which a stock photo could.
function ShapeGlyph({shape}: {shape: string}) {
  const common = "stroke-forest-700";
  if (shape === "Round") {
    return (
      <svg viewBox="0 0 40 34" className="h-7 w-8" fill="none" strokeWidth="1.4">
        <path d="M13 11c0-5 3-8 7-8s7 3 7 8" className={common} />
        <circle cx="20" cy="21" r="10" className={common} />
      </svg>
    );
  }
  if (shape === "House Shaped") {
    return (
      <svg viewBox="0 0 40 34" className="h-7 w-8" fill="none" strokeWidth="1.4">
        <path d="M13 11c0-5 3-8 7-8s7 3 7 8" className={common} />
        <path d="M20 11 32 18v13H8V18z" className={common} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 34" className="h-7 w-8" fill="none" strokeWidth="1.4">
      <path d="M13 11c0-5 3-8 7-8s7 3 7 8" className={common} />
      <rect x="8" y="11" width="24" height="20" rx="2" className={common} />
    </svg>
  );
}

export function PillRow({
  options,
  value,
  onSelect
}: {
  options: readonly string[];
  value: string;
  onSelect: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          aria-pressed={value === option}
          className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-all duration-200 ${
            value === option
              ? "border-forest-700 bg-forest-700 text-sand-50"
              : "border-[#ddd5c4] bg-[#fffdf9] text-forest-700 hover:border-forest-400"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function ColourRow({value, onSelect}: {value: string; onSelect: (next: string) => void}) {
  const colours = activeBagColours();
  const selected = colours.find((colour) => colour.id === value);

  return (
    <div className="space-y-1.5">
      <FieldLabel hint={selected?.label}>Base colour</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {colours.map((colour) => (
          <button
            key={colour.id}
            type="button"
            onClick={() => onSelect(colour.id)}
            aria-label={colour.label}
            aria-pressed={value === colour.id}
            title={colour.label}
            className={`h-7 w-7 rounded-full border transition-all duration-200 ${
              value === colour.id
                ? "border-forest-700 ring-2 ring-forest-700 ring-offset-2 ring-offset-[#fdfaf3]"
                : "border-[#cfc4ad] hover:border-forest-400"
            }`}
            style={{backgroundColor: colour.hex}}
          />
        ))}
      </div>
      {/* Natural fibre is undyed, so the swatch names the material rather
          than a paint colour  -  the honest description of the choice. */}
      <p className="text-[10px] leading-snug text-forest-400">Undyed natural fibre. The material is the colour.</p>
    </div>
  );
}

export function ConfigPanel({
  config,
  onChange
}: {
  config: CustomConfig;
  onChange: (next: CustomConfig) => void;
}) {
  if (config.productType === "Bags") {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel>Shape</FieldLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {customBagShapes.map((shape) => (
              <OptionCard
                key={shape}
                label={shape}
                selected={config.shape === shape}
                onClick={() => onChange({...config, shape})}
              >
                <ShapeGlyph shape={shape} />
              </OptionCard>
            ))}
          </div>
        </div>

        <ColourRow
          value={config.colour}
          onSelect={(colour) => onChange({...config, colour: colour as typeof config.colour})}
        />

        <div className="space-y-1.5">
          <FieldLabel>Size</FieldLabel>
          <PillRow
            options={customBagSizes}
            value={config.size}
            onSelect={(size) => onChange({...config, size: size as typeof config.size})}
          />
        </div>
      </div>
    );
  }

  if (config.productType === "Dolls") {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel>Who is it of?</FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {customDollSubjects.map((subject) => (
              <OptionCard
                key={subject}
                label={dollSubjectLabels[subject]}
                selected={config.subject === subject}
                onClick={() => onChange({...config, subject})}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <FieldLabel>Approximate size</FieldLabel>
          <PillRow
            options={customBagSizes}
            value={config.size}
            onSelect={(size) => onChange({...config, size: size as typeof config.size})}
          />
        </div>

        <div className="space-y-1.5">
          <FieldLabel hint="Optional">Clothing preference</FieldLabel>
          <textarea
            value={config.clothingPreference ?? ""}
            maxLength={200}
            rows={2}
            onChange={(event) => onChange({...config, clothingPreference: event.target.value})}
            placeholder="A favourite outfit, a colour they always wore…"
            className="w-full resize-none rounded-lg border border-[#ddd5c4] bg-white px-3 py-2 text-[13px] leading-relaxed text-forest-900 outline-none placeholder:text-forest-300 focus:border-forest-600"
          />
        </div>

        {/* Stated plainly rather than implied by the absence of controls. */}
        <p className="rounded-xl border border-[#e4dcc9] bg-[#faf6ec] px-3 py-2 text-[10.5px] leading-relaxed text-forest-600">
          Dolls are sculpted by hand from your photographs  -  the likeness comes from the pictures you upload.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <FieldLabel>Garment</FieldLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {customApparelGarments.map((garment) => (
            <OptionCard
              key={garment}
              label={garment}
              selected={config.garment === garment}
              onClick={() => onChange({...config, garment})}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Size</FieldLabel>
        <PillRow
          options={customApparelSizes}
          value={config.size}
          onSelect={(size) => onChange({...config, size: size as typeof config.size})}
        />
      </div>

      <ColourRow
        value={config.colour}
        onSelect={(colour) => onChange({...config, colour: colour as typeof config.colour})}
      />

      <div className="space-y-1.5">
        <FieldLabel>Placement</FieldLabel>
        <PillRow
          options={customApparelPlacements}
          value={config.placement}
          onSelect={(placement) => onChange({...config, placement: placement as typeof config.placement})}
        />
      </div>
    </div>
  );
}
