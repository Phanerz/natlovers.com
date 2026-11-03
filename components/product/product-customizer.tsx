"use client";

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
  onPersonalisationNoteChange
}: {
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

        {hasPersonalisation ? (
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="personal-note" className="pdp-option-title">
                Your note
              </label>
              <span className="pdp-option-value">{personalisationNote.length} / 500</span>
            </div>
            <textarea
              id="personal-note"
              value={personalisationNote}
              onChange={(event) => onPersonalisationNoteChange(event.target.value.slice(0, 500))}
              rows={3}
              placeholder="Anything you would like us to know…"
              className="pdp-input mt-3"
            />
            <p className="pdp-fineprint">Once you place your order, this note cannot be edited.</p>
          </div>
        ) : null}
      </div>

      <div className="pdp-note-rule mt-7" aria-hidden />
      <p className="pdp-note-sign">Made by hand, just for you</p>
    </section>
  );
}
