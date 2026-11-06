"use client";

import {AddonPicker} from "@/components/product/addon-picker";
import type {AddonCatalogue, AddonPick} from "@/lib/addon-shared";
import {colourSwatchStyle, type ColourOption} from "@/lib/colour-library";

// The product page's own customiser: base colour, handle colour and a
// personal note, each optional per product (see the admin form's Colours
// section). It lives in the details section, on the right, so it never crowds
// the buying column. Colour here is a free-form, admin-entered swatch per
// product (the multicolour swatch included), not Custom Studio's fixed
// material enum, so the two don't share a data shape.
function SwatchGroup({
  title,
  options,
  value,
  onChange
}: {
  title: string;
  options: ColourOption[];
  value: string | null;
  onChange: (label: string) => void;
}) {
  return (
    <div role="group" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="pdp-option-title">{title}</p>
        <p className="pdp-option-value" aria-live="polite">
          {value ?? ""}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        {options.map((option) => {
          const active = value === option.label;
          return (
            <button
              type="button"
              key={option.label}
              title={option.label}
              aria-label={option.label}
              aria-pressed={active}
              onClick={() => onChange(option.label)}
              className="pdp-swatch"
            >
              <span className="pdp-swatch-dot" style={colourSwatchStyle(option)} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The most characters a customer may write in their note.
const NOTE_MAX = 200;

export function ProductCustomizer({
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
  onPersonalisationNoteChange,
  addonCatalogue = null,
  addonPicks = [],
  onAddonPicksChange,
  onAddToBag,
  addToBagLabel = "Add to Bag",
  addToBagDisabled = false
}: {
  // The same Add to Bag as the one beside the photos, repeated at the foot of the note.
  onAddToBag?: () => void;
  addToBagLabel?: string;
  addToBagDisabled?: boolean;
  addonCatalogue?: AddonCatalogue | null;
  addonPicks?: AddonPick[];
  onAddonPicksChange?: (picks: AddonPick[]) => void;
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
  if (!hasBaseColour && !hasHandleColour && !hasPersonalisation) {
    return null;
  }

  return (
    <section id="customise" className="pdp-customise" aria-labelledby="customise-title">
      <p className="pdp-note-eyebrow">
        <span>Natlovers</span>
        <span aria-hidden>·</span>
        <span>Order note</span>
      </p>
      <h2 id="customise-title" className="pdp-note-title">
        Make it yours
      </h2>
      <p className="pdp-customise-lede">Pick the colours you would like below. If you want anything added or changed, write it on the lines.</p>
      <div className="pdp-note-rule" aria-hidden />

      <div className="mt-6 space-y-7">
        {hasBaseColour ? (
          <SwatchGroup title="Base colour" options={baseColourOptions} value={baseColour} onChange={onBaseColourChange} />
        ) : null}

        {hasHandleColour ? (
          <SwatchGroup title="Handle colour" options={handleColourOptions} value={handleColour} onChange={onHandleColourChange} />
        ) : null}

      </div>

      {hasPersonalisation && addonCatalogue && onAddonPicksChange ? (
        <AddonPicker catalogue={addonCatalogue} picks={addonPicks} onChange={onAddonPicksChange} />
      ) : null}

      {hasPersonalisation ? (
        <div className="mt-7">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="personal-note" className="pdp-option-title">
              Your note
            </label>
            <span className="pdp-option-value">{personalisationNote.length} / {NOTE_MAX}</span>
          </div>
          <textarea
            id="personal-note"
            value={personalisationNote}
            onChange={(event) => onPersonalisationNoteChange(event.target.value.slice(0, NOTE_MAX))}
            maxLength={NOTE_MAX}
            rows={3}
            placeholder="Anything you would like us to know…"
            className="pdp-input mt-3"
          />
          <p className="pdp-fineprint">Once you place your order, this note cannot be edited.</p>
        </div>
      ) : null}

      {onAddToBag ? (
        <button
          type="button"
          onClick={onAddToBag}
          disabled={addToBagDisabled}
          className="liquid-glass-dark button-lift mt-7 w-full rounded-full px-6 py-3.5 text-base font-semibold text-sand-50 backdrop-blur-[14px] backdrop-saturate-[160%] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
        >
          {addToBagLabel}
        </button>
      ) : null}

      <div className="pdp-note-rule mt-7" aria-hidden />
      <p className="pdp-note-sign">Made by hand, just for you</p>
    </section>
  );
}
