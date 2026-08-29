"use client";

import {Check} from "lucide-react";
import {ShopSize, shopSizes, sizeLabels} from "@/app/catalogue/shop-data";
import type {ColourOption} from "@/lib/admin-products";
import {resolveSizeDimensions, type SizeDimensionOverrides} from "@/lib/size-dimensions";

// The product page's own customiser: size first (with real dimensions per
// option), then base colour and handle colour, each entirely optional per
// product (see the admin form's Colours section). Deliberately not built on
// Custom Studio's ConfigPanel/CustomConfig - colour here is a free-form,
// admin-entered hex swatch per product, not Custom Studio's fixed five-
// material enum, so the two don't share a data shape. No shape selector:
// that's not something a customer picks here at all.
export function ProductCustomizer({
  showSize,
  size,
  onSizeChange,
  sizeDimensions,
  hasBaseColour,
  baseColourOptions,
  baseColour,
  onBaseColourChange,
  hasHandleColour,
  handleColourOptions,
  handleColour,
  onHandleColourChange,
  hasPersonalisation,
  personalisationNote,
  onPersonalisationNoteChange
}: {
  showSize: boolean;
  size: ShopSize;
  onSizeChange: (size: ShopSize) => void;
  // A product's own real measurements, per size  -  a size missing here
  // falls back to the shared placeholder table (see lib/size-dimensions.ts).
  sizeDimensions: SizeDimensionOverrides;
  hasBaseColour: boolean;
  baseColourOptions: ColourOption[];
  baseColour: string | null;
  onBaseColourChange: (label: string) => void;
  hasHandleColour: boolean;
  handleColourOptions: ColourOption[];
  handleColour: string | null;
  onHandleColourChange: (label: string) => void;
  hasPersonalisation: boolean;
  personalisationNote: string;
  onPersonalisationNoteChange: (note: string) => void;
}) {
  let step = 0;
  if (showSize) step += 1;
  const sizeStep = showSize ? step : null;
  if (hasBaseColour) step += 1;
  const baseColourStep = hasBaseColour ? step : null;
  if (hasHandleColour) step += 1;
  const handleColourStep = hasHandleColour ? step : null;
  if (hasPersonalisation) step += 1;
  const personalisationStep = hasPersonalisation ? step : null;

  if (!showSize && !hasBaseColour && !hasHandleColour && !hasPersonalisation) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-xl border border-[#ecdfc4] bg-[#fbf3e2] p-3.5 sm:p-4">
      {showSize ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-forest-900">{sizeStep}. Choose your size</p>
          <div className="grid grid-cols-3 gap-2">
            {shopSizes.map((option) => {
              const dims = resolveSizeDimensions(option, sizeDimensions);
              const active = option === size;
              return (
                <button
                  type="button"
                  key={option}
                  onClick={() => onSizeChange(option)}
                  aria-pressed={active}
                  className={`relative rounded-xl border p-3 text-left transition-colors duration-150 ${
                    active ? "border-forest-700 bg-white" : "border-[#ddd5c4] bg-[#fffdf9] hover:border-forest-400"
                  }`}
                >
                  {active ? (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-forest-700 text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                  <p className="text-sm font-semibold text-forest-900">{sizeLabels[option].en}</p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-forest-500">
                    L: {dims.L} cm
                    <br />
                    W: {dims.W} cm
                    <br />
                    H: {dims.H} cm
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {hasBaseColour ? (
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-forest-900">{baseColourStep}. Base colour</p>
            <span className="text-[11px] text-forest-400">Optional</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {baseColourOptions.map((option) => {
              const active = baseColour === option.label;
              return (
                <button
                  type="button"
                  key={option.label}
                  title={option.label}
                  aria-label={option.label}
                  aria-pressed={active}
                  onClick={() => onBaseColourChange(option.label)}
                  className={`h-8 w-8 rounded-full border-2 transition-all duration-150 ${
                    active ? "border-forest-700 ring-2 ring-forest-700 ring-offset-2 ring-offset-[#fbf3e2]" : "border-white/80 hover:border-forest-300"
                  }`}
                  style={{backgroundColor: option.hex}}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {hasHandleColour ? (
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-forest-900">{handleColourStep}. Handle colour</p>
            <span className="text-[11px] text-forest-400">Optional</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {handleColourOptions.map((option) => {
              const active = handleColour === option.label;
              return (
                <button
                  type="button"
                  key={option.label}
                  title={option.label}
                  aria-label={option.label}
                  aria-pressed={active}
                  onClick={() => onHandleColourChange(option.label)}
                  className={`h-8 w-8 rounded-full border-2 transition-all duration-150 ${
                    active ? "border-forest-700 ring-2 ring-forest-700 ring-offset-2 ring-offset-[#fbf3e2]" : "border-white/80 hover:border-forest-300"
                  }`}
                  style={{backgroundColor: option.hex}}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {hasPersonalisation ? (
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold text-forest-900">{personalisationStep}. Add a note</p>
            <span className="text-[11px] text-forest-400">Optional</span>
          </div>
          <textarea
            value={personalisationNote}
            onChange={(event) => onPersonalisationNoteChange(event.target.value.slice(0, 500))}
            rows={2}
            placeholder="A message or request for this piece..."
            className="mt-2 w-full rounded-lg border border-[#ddd5c4] bg-[#fffdf9] px-3 py-2 text-sm text-forest-900 outline-none focus:border-forest-400"
          />
          <p className="mt-1 text-[11px] text-forest-500">This note cannot be changed once your order is placed.</p>
        </div>
      ) : null}
    </div>
  );
}
