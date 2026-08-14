"use client";

import {Bird, Flower2, Heart, Leaf, Mountain, Star, Sun, Type, Waves} from "lucide-react";
import type {ComponentType} from "react";
import {
  activeBagColours,
  customApparelGarments,
  customApparelPlacements,
  customApparelSizes,
  customBagHandles,
  customBagShapes,
  customBagSizes,
  customDollSubjects,
  customMotifs,
  dollSubjectLabels,
  emptyPersonalisation,
  MAX_PERSONALISATION_TEXT,
  type CustomConfig,
  type CustomMotifId
} from "@/lib/custom-studio";
import {availableHandlesForShape, type PreviewCatalogue} from "@/lib/custom-preview";

// The left column. One panel per product type, because each category owns a
// genuinely different schema — a doll has no handle and a bag has no
// garment, and a single generic form would have to pretend otherwise.

const motifIcons: Record<CustomMotifId, ComponentType<{className?: string}>> = {
  leaf: Leaf,
  flower: Flower2,
  bird: Bird,
  wave: Waves,
  sun: Sun,
  mountain: Mountain,
  heart: Heart,
  star: Star
};

function StepLabel({index, children}: {index: number; children: React.ReactNode}) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-forest-500">
      {index}. {children}
    </p>
  );
}

function OptionCard({
  selected,
  disabled,
  onClick,
  label,
  children
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`relative flex flex-col items-center justify-end gap-1.5 rounded-2xl border px-2 py-3 text-center transition-all duration-200 ${
        disabled
          ? "cursor-not-allowed border-[#e2dccd] bg-[#f6f3ea] opacity-45"
          : selected
            ? "border-forest-700 bg-white shadow-[0_10px_28px_rgba(23,32,21,0.10)]"
            : "border-[#ddd5c4] bg-[#fffdf9] hover:border-forest-400 hover:bg-white"
      }`}
    >
      {selected && !disabled ? (
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-forest-700 text-[9px] text-sand-50">
          ✓
        </span>
      ) : null}
      {children}
      <span className="text-[11px] font-medium leading-tight text-forest-800">{label}</span>
    </button>
  );
}

// Simple silhouettes drawn from the shape name. Deliberately abstract line
// art rather than a stand-in photograph — a diagram cannot be mistaken for
// a picture of the finished piece, which a stock photo could.
function ShapeGlyph({shape}: {shape: string}) {
  const common = "stroke-forest-700";
  if (shape === "Round") {
    return (
      <svg viewBox="0 0 40 34" className="h-9 w-10" fill="none" strokeWidth="1.4">
        <path d="M13 11c0-5 3-8 7-8s7 3 7 8" className={common} />
        <circle cx="20" cy="21" r="10" className={common} />
      </svg>
    );
  }
  if (shape === "House Shaped") {
    return (
      <svg viewBox="0 0 40 34" className="h-9 w-10" fill="none" strokeWidth="1.4">
        <path d="M13 11c0-5 3-8 7-8s7 3 7 8" className={common} />
        <path d="M20 11 32 18v13H8V18z" className={common} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 34" className="h-9 w-10" fill="none" strokeWidth="1.4">
      <path d="M13 11c0-5 3-8 7-8s7 3 7 8" className={common} />
      <rect x="8" y="11" width="24" height="20" rx="2" className={common} />
    </svg>
  );
}

function HandleGlyph({handle}: {handle: string}) {
  const common = "stroke-forest-700";
  const body = <rect x="7" y="14" width="26" height="17" rx="3" className={common} />;
  if (handle === "Clutch") {
    return (
      <svg viewBox="0 0 40 34" className="h-9 w-10" fill="none" strokeWidth="1.4">
        {body}
        <path d="M7 20h26" className={common} />
      </svg>
    );
  }
  if (handle === "Sling Bag") {
    return (
      <svg viewBox="0 0 40 34" className="h-9 w-10" fill="none" strokeWidth="1.4">
        {body}
        <path d="M9 14 24 3" className={common} />
      </svg>
    );
  }
  if (handle === "Shoulder Bag") {
    return (
      <svg viewBox="0 0 40 34" className="h-9 w-10" fill="none" strokeWidth="1.4">
        {body}
        <path d="M11 14c0-9 18-9 18 0" className={common} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 34" className="h-9 w-10" fill="none" strokeWidth="1.4">
      {body}
      <path d="M14 14c0-6 12-6 12 0" className={common} />
    </svg>
  );
}

function PersonalTouch({
  index,
  config,
  onChange
}: {
  index: number;
  config: CustomConfig;
  onChange: (next: CustomConfig) => void;
}) {
  const personalisation = config.personalisation;

  function set(next: CustomConfig["personalisation"]) {
    onChange({...config, personalisation: next} as CustomConfig);
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <StepLabel index={index}>Personal touch</StepLabel>
        <span className="text-[10px] uppercase tracking-[0.18em] text-forest-400">Optional</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => set(personalisation.kind === "text" ? emptyPersonalisation : {kind: "text", text: ""})}
          aria-pressed={personalisation.kind === "text"}
          className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 text-[11px] font-medium transition-all duration-200 ${
            personalisation.kind === "text"
              ? "border-forest-700 bg-white text-forest-900"
              : "border-[#ddd5c4] bg-[#fffdf9] text-forest-700 hover:border-forest-400"
          }`}
        >
          <Type className="h-3.5 w-3.5" />
          Add text / initials
        </button>
        <button
          type="button"
          onClick={() => set(personalisation.kind === "motif" ? emptyPersonalisation : {kind: "motif", motifId: "leaf"})}
          aria-pressed={personalisation.kind === "motif"}
          className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 text-[11px] font-medium transition-all duration-200 ${
            personalisation.kind === "motif"
              ? "border-forest-700 bg-white text-forest-900"
              : "border-[#ddd5c4] bg-[#fffdf9] text-forest-700 hover:border-forest-400"
          }`}
        >
          <Leaf className="h-3.5 w-3.5" />
          Add small motif
        </button>
      </div>

      {personalisation.kind === "text" ? (
        <div className="space-y-1">
          <input
            value={personalisation.text}
            maxLength={MAX_PERSONALISATION_TEXT}
            onChange={(event) => set({kind: "text", text: event.target.value})}
            placeholder="A name, initials, a short word"
            className="w-full rounded-xl border border-[#ddd5c4] bg-white px-3 py-2 text-sm text-forest-900 outline-none placeholder:text-forest-300 focus:border-forest-600"
          />
          <div className="flex items-center justify-between text-[10px] text-forest-400">
            <span>Hand-stitched, so shorter reads better.</span>
            <span>
              {personalisation.text.length} / {MAX_PERSONALISATION_TEXT}
            </span>
          </div>
        </div>
      ) : null}

      {personalisation.kind === "motif" ? (
        <div className="grid grid-cols-4 gap-1.5">
          {customMotifs.map((motif) => {
            const Icon = motifIcons[motif.id];
            const selected = personalisation.motifId === motif.id;
            return (
              <button
                key={motif.id}
                type="button"
                onClick={() => set({kind: "motif", motifId: motif.id})}
                aria-pressed={selected}
                title={motif.label}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-all duration-200 ${
                  selected ? "border-forest-700 bg-white" : "border-[#ddd5c4] bg-[#fffdf9] hover:border-forest-400"
                }`}
              >
                <Icon className="h-4 w-4 text-forest-700" />
                <span className="text-[9px] text-forest-600">{motif.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SizeRow({
  index,
  options,
  value,
  onSelect,
  label = "Size"
}: {
  index: number;
  options: readonly string[];
  value: string;
  onSelect: (next: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <StepLabel index={index}>{label}</StepLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            aria-pressed={value === option}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ${
              value === option
                ? "border-forest-700 bg-forest-700 text-sand-50"
                : "border-[#ddd5c4] bg-[#fffdf9] text-forest-700 hover:border-forest-400"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColourRow({
  index,
  value,
  onSelect
}: {
  index: number;
  value: string;
  onSelect: (next: string) => void;
}) {
  const colours = activeBagColours();
  const selected = colours.find((colour) => colour.id === value);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <StepLabel index={index}>Base colour</StepLabel>
        <span className="text-[10px] text-forest-500">{selected?.label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {colours.map((colour) => (
          <button
            key={colour.id}
            type="button"
            onClick={() => onSelect(colour.id)}
            aria-label={colour.label}
            aria-pressed={value === colour.id}
            title={colour.label}
            className={`relative h-8 w-8 rounded-full border transition-all duration-200 ${
              value === colour.id
                ? "border-forest-700 ring-2 ring-forest-700 ring-offset-2 ring-offset-[#fffdf9]"
                : "border-[#cfc4ad] hover:border-forest-400"
            }`}
            style={{backgroundColor: colour.hex}}
          />
        ))}
      </div>
      {/* Natural fibre is undyed, so the swatch names the material rather
          than a paint colour — this is the honest description of what a
          customer is choosing. */}
      <p className="text-[10px] leading-snug text-forest-400">
        Undyed natural fibre — the material is the colour.
      </p>
    </div>
  );
}

export function ConfigPanel({
  config,
  onChange,
  catalogue
}: {
  config: CustomConfig;
  onChange: (next: CustomConfig) => void;
  catalogue: PreviewCatalogue;
}) {
  if (config.productType === "Bags") {
    // Derived from real products, not asserted: a handle is offered for a
    // shape only when the workshop has actually made that combination.
    const available = availableHandlesForShape(config.shape, catalogue);
    const catalogueHasBags = catalogue.Bags.length > 0;

    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <StepLabel index={1}>Choose shape</StepLabel>
          <div className="grid grid-cols-3 gap-2">
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

        <ColourRow index={2} value={config.colour} onSelect={(colour) => onChange({...config, colour: colour as typeof config.colour})} />

        <div className="space-y-2">
          <StepLabel index={3}>Handle</StepLabel>
          <div className="grid grid-cols-4 gap-1.5">
            {customBagHandles.map((handle) => {
              const unavailable = catalogueHasBags && !available.has(handle);
              return (
                <OptionCard
                  key={handle}
                  label={handle}
                  selected={config.handle === handle}
                  disabled={unavailable}
                  onClick={() => onChange({...config, handle})}
                >
                  <HandleGlyph handle={handle} />
                </OptionCard>
              );
            })}
          </div>
          {catalogueHasBags && !available.has(config.handle) ? (
            <p className="text-[10px] leading-snug text-[#8a5a3b]">
              We haven&apos;t made a {config.shape.toLowerCase()} bag with this handle before — the studio will confirm
              whether it&apos;s possible.
            </p>
          ) : null}
          {customBagHandles.some((handle) => catalogueHasBags && !available.has(handle)) ? (
            <p className="text-[10px] leading-snug text-forest-400">
              Greyed-out handles aren&apos;t available for a {config.shape.toLowerCase()} bag.
            </p>
          ) : null}
        </div>

        <SizeRow
          index={4}
          options={customBagSizes}
          value={config.size}
          onSelect={(size) => onChange({...config, size: size as typeof config.size})}
        />

        <PersonalTouch index={5} config={config} onChange={onChange} />
      </div>
    );
  }

  if (config.productType === "Dolls") {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <StepLabel index={1}>Who is it of?</StepLabel>
          <div className="grid grid-cols-2 gap-2">
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

        <SizeRow
          index={2}
          label="Approximate size"
          options={customBagSizes}
          value={config.size}
          onSelect={(size) => onChange({...config, size: size as typeof config.size})}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <StepLabel index={3}>Clothing preference</StepLabel>
            <span className="text-[10px] uppercase tracking-[0.18em] text-forest-400">Optional</span>
          </div>
          <textarea
            value={config.clothingPreference ?? ""}
            maxLength={200}
            rows={3}
            onChange={(event) => onChange({...config, clothingPreference: event.target.value})}
            placeholder="A favourite outfit, a colour they always wore, anything that matters"
            className="w-full resize-none rounded-xl border border-[#ddd5c4] bg-white px-3 py-2 text-sm leading-relaxed text-forest-900 outline-none placeholder:text-forest-300 focus:border-forest-600"
          />
          <p className="text-right text-[10px] text-forest-400">{(config.clothingPreference ?? "").length} / 200</p>
        </div>

        <PersonalTouch index={4} config={config} onChange={onChange} />

        {/* Stated plainly rather than implied by the absence of controls. */}
        <p className="rounded-2xl border border-[#e4dcc9] bg-[#faf6ec] px-3 py-2.5 text-[11px] leading-relaxed text-forest-600">
          Dolls are sculpted by hand from your photographs, so there are no fine-grained options here. The likeness comes
          from the pictures you upload and what you tell us.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <StepLabel index={1}>Garment</StepLabel>
        <div className="grid grid-cols-2 gap-2">
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

      <SizeRow
        index={2}
        options={customApparelSizes}
        value={config.size}
        onSelect={(size) => onChange({...config, size: size as typeof config.size})}
      />

      <ColourRow index={3} value={config.colour} onSelect={(colour) => onChange({...config, colour: colour as typeof config.colour})} />

      <div className="space-y-2">
        <StepLabel index={4}>Placement</StepLabel>
        <div className="flex flex-wrap gap-1.5">
          {customApparelPlacements.map((placement) => (
            <button
              key={placement}
              type="button"
              onClick={() => onChange({...config, placement})}
              aria-pressed={config.placement === placement}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                config.placement === placement
                  ? "border-forest-700 bg-forest-700 text-sand-50"
                  : "border-[#ddd5c4] bg-[#fffdf9] text-forest-700 hover:border-forest-400"
              }`}
            >
              {placement}
            </button>
          ))}
        </div>
      </div>

      <PersonalTouch index={5} config={config} onChange={onChange} />
    </div>
  );
}
