import {z} from "zod";

// Pure add-on types and helpers shared by the storefront, the admin and the
// server. Nothing here touches the database, so client components may import it.

export const ADDON_COLOUR_KINDS = ["solid", "two_tone", "gradient"] as const;
export type AddonColourKind = (typeof ADDON_COLOUR_KINDS)[number];

export type AddonColourView = {
  id: string;
  label: string;
  kind: AddonColourKind;
  hexes: string[];
  isDefault: boolean;
  active: boolean;
};

export type AddonPoseView = {id: string; label: string};

export type AddonImageView = {
  id: string;
  url: string;
  poseId: string | null;
  colourId: string | null;
  zoom: number;
  isPrimary: boolean;
};

export type AddonSpeciesView = {
  id: string;
  kind: string;
  name: string;
  slug: string;
  active: boolean;
  poseLabel: string | null;
  colourGroupId: string;
  colours: AddonColourView[];
  poses: AddonPoseView[];
  images: AddonImageView[];
};

export type AddonCatalogue = {
  priceIdr: number;
  priceUsdCents: number;
  maxPerBag: number;
  species: AddonSpeciesView[];
};

// What the customer picked for one add-on. Ids only; the server looks every one
// up again, so a tampered request can never name a price or an inactive species.
export const addonPickSchema = z.object({
  speciesId: z.string().trim().min(1).max(64),
  colourId: z.string().trim().min(1).max(64),
  poseId: z.string().trim().max(64).optional(),
  note: z.string().trim().max(300).optional()
});
export type AddonPick = z.infer<typeof addonPickSchema>;

export const ADDON_MAX_HARD_LIMIT = 8;

// The frozen description of one add-on as stored on the order.
export type AddonOrderLine = {
  speciesId: string | null;
  speciesName: string;
  colourLabel: string;
  colourKind: AddonColourKind;
  colourHexes: string[];
  poseLabel: string | null;
  note: string | null;
  imageUrl: string | null;
  priceIdr: number;
  priceUsdCents: number;
};

// A CSS background for a swatch. One flat colour, a hard two-tone split, or a
// soft blend for gradients.
export function addonSwatchBackground(kind: string, hexes: string[]): string {
  const stops = hexes.filter(Boolean);
  if (stops.length === 0) return "#cccccc";
  if (stops.length === 1 || kind === "solid") return stops[0];
  if (kind === "two_tone") {
    const [a, b] = stops;
    return `linear-gradient(90deg, ${a} 0 50%, ${b ?? a} 50% 100%)`;
  }
  return `linear-gradient(135deg, ${stops.join(", ")})`;
}

// The most specific reference photo for a choice: pose and colour together,
// then pose, then colour, then the species' primary photo, then any photo.
export function pickAddonImage(species: AddonSpeciesView, poseId: string | null, colourId: string | null): AddonImageView | null {
  const images = species.images;
  if (!images.length) return null;
  const match = (pose: boolean, colour: boolean) =>
    images.find((image) => (pose ? image.poseId === poseId && poseId : !image.poseId) && (colour ? image.colourId === colourId && colourId : !image.colourId));
  return match(true, true) ?? match(true, false) ?? match(false, true) ?? images.find((image) => image.isPrimary) ?? images[0];
}

export function defaultAddonPick(species: AddonSpeciesView): AddonPick | null {
  const colour = species.colours.find((entry) => entry.isDefault) ?? species.colours[0];
  if (!colour) return null;
  return {speciesId: species.id, colourId: colour.id, ...(species.poses[0] ? {poseId: species.poses[0].id} : {})};
}

// The priced, readable lines the cart shows for a set of picks. Display only:
// the server rebuilds them from the database when the order is placed.
export function buildAddonLines(catalogue: AddonCatalogue, picks: AddonPick[]) {
  const lines: {label: string; value: string; extraIdr: number; extraUsdCents: number; hex?: string}[] = [];
  picks.forEach((pick, index) => {
    const species = catalogue.species.find((entry) => entry.id === pick.speciesId);
    if (!species) return;
    const described = describeAddonPick(species, pick);
    lines.push({
      label: `${species.name} ${index + 1}`,
      value: pick.note ? `${described.value} (note: ${pick.note})` : described.value,
      extraIdr: catalogue.priceIdr,
      extraUsdCents: catalogue.priceUsdCents,
      hex: described.hex
    });
  });
  return lines;
}

// Turns a pick into the readable receipt line the cart and order lists show.
export function describeAddonPick(species: AddonSpeciesView, pick: AddonPick) {
  const colour = species.colours.find((entry) => entry.id === pick.colourId);
  const pose = species.poses.find((entry) => entry.id === pick.poseId);
  const value = [colour?.label, pose?.label].filter(Boolean).join(" · ");
  return {value, hex: colour?.hexes[0], colour, pose};
}
