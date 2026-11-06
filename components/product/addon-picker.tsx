"use client";

import {useMemo, useState} from "react";
import {Check, Plus} from "lucide-react";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {
  addonSwatchBackground,
  defaultAddonPick,
  describeAddonPick,
  pickAddonImage,
  type AddonCatalogue,
  type AddonPick,
  type AddonSpeciesView
} from "@/lib/addon-shared";
import {formatCurrency} from "@/lib/format";

// The felted-animal add-ons inside Make it yours. Built for a customer who may
// find small controls hard: one choice at a time, big photographs, big colour
// swatches with the colour name always written out, and large buttons. The
// species grid picks the animal, then one panel shows its photo, colours, pose
// and note, then "Add" files it onto the list below. Flat cream card, no glass.

function SpeciesPhoto({species, poseId, colourId, className = ""}: {species: AddonSpeciesView; poseId: string | null; colourId: string | null; className?: string}) {
  const image = pickAddonImage(species, poseId, colourId);
  if (!image) {
    return (
      <div className={`addon-photo addon-photo-empty ${className}`} aria-hidden>
        <span>{species.name}</span>
      </div>
    );
  }
  return (
    <div className={`addon-photo ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt={`${species.name}, felted by hand`} loading="lazy" draggable={false} style={{transform: `scale(${image.zoom})`}} />
    </div>
  );
}

export function AddonPicker({
  catalogue,
  picks,
  onChange
}: {
  catalogue: AddonCatalogue;
  picks: AddonPick[];
  onChange: (picks: AddonPick[]) => void;
}) {
  const {currency} = useSitePreferences();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AddonPick | null>(null);

  const price = currency === "IDR" ? catalogue.priceIdr : catalogue.priceUsdCents / 100;
  const priceText = formatCurrency(price, currency);
  const bySpecies = useMemo(() => new Map(catalogue.species.map((species) => [species.id, species])), [catalogue.species]);
  const open = openId ? bySpecies.get(openId) ?? null : null;
  const full = picks.length >= catalogue.maxPerBag;

  function choose(species: AddonSpeciesView) {
    setOpenId(species.id);
    setDraft(defaultAddonPick(species));
  }

  function add() {
    if (!draft || full) return;
    onChange([...picks, draft]);
    setOpenId(null);
    setDraft(null);
  }

  return (
    <div className="addon-block">
      <div className="pdp-note-rule" aria-hidden />
      <h3 className="addon-title">Add a felted friend</h3>
      <p className="addon-lede">
        Each little animal is made by hand and sewn to your bag. Every one is {priceText}, whichever animal and colour you choose.
      </p>

      <div className="addon-grid" role="group" aria-label="Choose an animal">
        {catalogue.species.map((species) => {
          const count = picks.filter((pick) => pick.speciesId === species.id).length;
          return (
            <button
              type="button"
              key={species.id}
              className="addon-tile"
              aria-pressed={openId === species.id}
              onClick={() => choose(species)}
            >
              <SpeciesPhoto species={species} poseId={null} colourId={null} />
              <span className="addon-tile-name">{species.name}</span>
              {count ? <span className="addon-tile-count">{count} added</span> : null}
            </button>
          );
        })}
      </div>

      {open && draft ? (
        <section className="addon-panel" aria-label={`Choose your ${open.name}`}>
          <SpeciesPhoto species={open} poseId={draft.poseId ?? null} colourId={draft.colourId} className="addon-photo-large" />
          <h4 className="addon-panel-title">{open.name}</h4>

          <div role="group" aria-label={`${open.name} colour`}>
            <p className="addon-label">
              Colour: <strong>{open.colours.find((colour) => colour.id === draft.colourId)?.label}</strong>
            </p>
            <div className="addon-swatches">
              {open.colours.map((colour) => {
                const active = colour.id === draft.colourId;
                return (
                  <button
                    type="button"
                    key={colour.id}
                    className="addon-swatch"
                    aria-label={colour.label}
                    aria-pressed={active}
                    title={colour.label}
                    onClick={() => setDraft({...draft, colourId: colour.id})}
                  >
                    <span className="addon-swatch-dot" style={{background: addonSwatchBackground(colour.kind, colour.hexes)}} />
                    {active ? <Check className="addon-swatch-check" aria-hidden strokeWidth={3} /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {open.poses.length ? (
            <div role="group" aria-label={open.poseLabel ?? "Pose"} className="mt-6">
              <p className="addon-label">{open.poseLabel ?? "Pose"}</p>
              <div className="addon-poses">
                {open.poses.map((pose) => (
                  <button
                    type="button"
                    key={pose.id}
                    className="addon-pose"
                    aria-pressed={pose.id === draft.poseId}
                    onClick={() => setDraft({...draft, poseId: pose.id})}
                  >
                    {pose.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <label htmlFor="addon-note" className="addon-label">
              Anything we should know about this one? <span className="addon-optional">(optional)</span>
            </label>
            <textarea
              id="addon-note"
              rows={2}
              maxLength={300}
              value={draft.note ?? ""}
              onChange={(event) => setDraft({...draft, note: event.target.value.slice(0, 300)})}
              placeholder="For example: a white sock on the left front paw"
              className="addon-input"
            />
          </div>

          <div className="addon-actions">
            <button type="button" className="addon-btn addon-btn-primary" onClick={add} disabled={full}>
              <Plus aria-hidden className="h-5 w-5" strokeWidth={2.5} />
              Add this {open.name.toLowerCase()} ({priceText})
            </button>
            <button type="button" className="addon-btn" onClick={() => setOpenId(null)}>
              Not now
            </button>
          </div>
          {full ? <p className="addon-warn">A bag can carry up to {catalogue.maxPerBag} friends. Remove one to add another.</p> : null}
        </section>
      ) : null}

      {picks.length ? (
        <div className="addon-list" aria-live="polite">
          <p className="addon-label">Your felted friends</p>
          <ul>
            {picks.map((pick, index) => {
              const species = bySpecies.get(pick.speciesId);
              if (!species) return null;
              const described = describeAddonPick(species, pick);
              return (
                <li key={`${pick.speciesId}-${index}`} className="addon-row">
                  <SpeciesPhoto species={species} poseId={pick.poseId ?? null} colourId={pick.colourId} className="addon-photo-small" />
                  <div className="addon-row-text">
                    <p className="addon-row-name">{species.name}</p>
                    <p className="addon-row-detail">{described.value}</p>
                    {pick.note ? <p className="addon-row-note">{pick.note}</p> : null}
                    <p className="addon-row-price">{priceText}</p>
                  </div>
                  <button type="button" className="addon-btn addon-btn-small" onClick={() => onChange(picks.filter((_, at) => at !== index))}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="addon-total">
            {picks.length} {picks.length === 1 ? "friend" : "friends"}, adding <strong>{formatCurrency(price * picks.length, currency)}</strong> to your bag
          </p>
        </div>
      ) : null}
    </div>
  );
}
