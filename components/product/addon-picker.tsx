"use client";

import {useEffect, useRef, useState} from "react";
import {Camera, Check, ChevronDown, Plus, X} from "lucide-react";
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
import {ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MB} from "@/lib/upload-limits";

// The felted-animal add-ons inside Make it yours, folded into one dropdown so the
// note stays short. Built for a customer who may find small controls hard: one
// choice at a time, big colour blocks with the colour name written under every
// one, and large buttons. The grid picks the animal, one panel shows its photo,
// colours, pose and an optional photo upload, and "Add" files it onto the list.
// Flat cream card, no glass.

const MAX_PHOTOS = 3;
const MAX_EDGE = 1800;

// Scales a photo down to at most 1800px on its long edge and saves it as JPEG.
// Returns null when the file cannot be read as a picture at all.
async function shrinkPhoto(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, {type: "image/jpeg"});
  } catch {
    // Not decodable here: send the original only if the server would accept it.
    return ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number]) ? file : null;
  }
}

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
  const [expanded, setExpanded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AddonPick | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const price = currency === "IDR" ? catalogue.priceIdr : catalogue.priceUsdCents / 100;
  const priceText = formatCurrency(price, currency);
  const bySpecies = new Map(catalogue.species.map((species) => [species.id, species]));
  const open = openId ? bySpecies.get(openId) ?? null : null;
  const full = picks.length >= catalogue.maxPerBag;
  const photos = draft?.images ?? [];

  // Bring the panel into view when an animal is chosen, so on a phone it is never
  // left below the fold.
  useEffect(() => {
    if (openId) panelRef.current?.scrollIntoView({behavior: "smooth", block: "nearest"});
  }, [openId]);

  function choose(species: AddonSpeciesView) {
    setOpenId(species.id);
    setDraft(defaultAddonPick(species));
    setUploadError(null);
  }

  function close() {
    setOpenId(null);
    setDraft(null);
    setUploadError(null);
  }

  function add() {
    if (!draft || full) return;
    onChange([...picks, draft]);
    close();
  }

  async function upload(files: FileList | null) {
    if (!files?.length || !draft) return;
    const room = MAX_PHOTOS - photos.length;
    const chosen = Array.from(files).slice(0, room);
    setUploading(true);
    setUploadError(null);
    try {
      // Phone photos are large; shrinking them first keeps the upload quick and
      // well inside the server's request limit.
      const prepared: File[] = [];
      for (const file of chosen) {
        const small = await shrinkPhoto(file);
        if (!small) throw new Error(`"${file.name}" is not a photo we can use. Please choose a JPG, PNG or WebP picture.`);
        if (small.size > MAX_IMAGE_BYTES) throw new Error(`"${file.name}" is bigger than ${MAX_IMAGE_MB}MB. Please choose a smaller photo.`);
        prepared.push(small);
      }
      const form = new FormData();
      prepared.forEach((file) => form.append("files", file));
      const response = await fetch("/api/product-options/upload", {method: "POST", body: form});
      const body = (await response.json().catch(() => ({}))) as {urls?: string[]; error?: string};
      if (!response.ok || !body.urls) throw new Error(body.error ?? "We could not upload your photo. Please try again.");
      const urls = body.urls;
      setDraft((current) => (current ? {...current, images: [...(current.images ?? []), ...urls].slice(0, MAX_PHOTOS)} : current));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "We could not upload your photo. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="addon-block">
      <div className="pdp-note-rule" aria-hidden />
      <button
        type="button"
        className="addon-toggle"
        aria-expanded={expanded}
        aria-controls="addon-body"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="addon-title">Add a felted friend</span>
        {picks.length ? <span className="addon-count">{picks.length} added</span> : null}
        <ChevronDown aria-hidden className={`addon-chevron ${expanded ? "addon-chevron-open" : ""}`} />
      </button>

      {expanded ? (
        <div id="addon-body">
          <p className="addon-lede">
            Bring a little friend along. Every one is made by hand and sewn onto your bag, so a much-loved pet or a favourite animal can
            travel with you. Each one is {priceText}, whichever animal and colour you choose.
          </p>

          <div className="addon-grid" role="group" aria-label="Choose an animal">
            {catalogue.species.map((species) => {
              const count = picks.filter((pick) => pick.speciesId === species.id).length;
              return (
                <button type="button" key={species.id} className="addon-tile" aria-pressed={openId === species.id} onClick={() => choose(species)}>
                  <SpeciesPhoto species={species} poseId={null} colourId={null} />
                  <span className="addon-tile-name">{species.name.replace(" / ", "/")}</span>
                  {count ? <span className="addon-tile-count">{count}</span> : null}
                </button>
              );
            })}
          </div>

          {open && draft ? (
            <section ref={panelRef} className="addon-panel" aria-label={`Choose your ${open.name}`}>
              <div className="addon-panel-head">
                <SpeciesPhoto species={open} poseId={draft.poseId ?? null} colourId={draft.colourId} className="addon-photo-head" />
                <div className="addon-panel-head-text">
                  <h4 className="addon-panel-title">{open.name}</h4>
                  <p className="addon-help">{describeAddonPick(open, draft).value}</p>
                </div>
              </div>

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
                        onClick={() => setDraft({...draft, colourId: colour.id})}
                      >
                        <span className="addon-swatch-dot" style={{background: addonSwatchBackground(colour.kind, colour.hexes)}}>
                          {active ? <Check className="addon-swatch-check" aria-hidden strokeWidth={3} /> : null}
                        </span>
                        <span className="addon-swatch-name">{colour.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {open.poses.length ? (
                <div role="group" aria-label={open.poseLabel ?? "Pose"} className="addon-section">
                  <p className="addon-label">{open.poseLabel ?? "Pose"}</p>
                  <div className="addon-poses">
                    {open.poses.map((pose) => (
                      <button type="button" key={pose.id} className="addon-pose" aria-pressed={pose.id === draft.poseId} onClick={() => setDraft({...draft, poseId: pose.id})}>
                        {pose.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="addon-section">
                <p className="addon-label">
                  Show us who you have in mind <span className="addon-optional">(optional)</span>
                </p>
                <p className="addon-help">
                  A photo of your pet, someone you love, or your home. We will make your little friend look just like them.
                </p>
                {photos.length ? (
                  <ul className="addon-uploads">
                    {photos.map((url) => (
                      <li key={url} className="addon-upload">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Your photo" draggable={false} />
                        <button
                          type="button"
                          className="addon-upload-remove"
                          aria-label="Remove this photo"
                          onClick={() => setDraft({...draft, images: photos.filter((other) => other !== url)})}
                        >
                          <X aria-hidden className="h-4 w-4" strokeWidth={3} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {photos.length < MAX_PHOTOS ? (
                  <>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(event) => void upload(event.target.files)} />
                    <button type="button" className="addon-btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
                      <Camera aria-hidden className="h-5 w-5" />
                      {uploading ? "Uploading..." : photos.length ? "Add another photo" : "Choose a photo"}
                    </button>
                  </>
                ) : (
                  <p className="addon-help">That is the most photos for one friend ({MAX_PHOTOS}).</p>
                )}
                {uploadError ? (
                  <p className="addon-error" role="alert">
                    {uploadError}
                  </p>
                ) : null}
              </div>

              <div className="addon-actions">
                <button type="button" className="addon-btn addon-btn-primary" onClick={add} disabled={full || uploading}>
                  <Plus aria-hidden className="h-5 w-5" strokeWidth={2.5} />
                  Add this {open.name.toLowerCase()} ({priceText})
                </button>
                <button type="button" className="addon-btn" onClick={close}>
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
                        {pick.images?.length ? (
                          <p className="addon-row-detail">
                            {pick.images.length} {pick.images.length === 1 ? "photo" : "photos"} attached
                          </p>
                        ) : null}
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
      ) : null}
    </div>
  );
}
