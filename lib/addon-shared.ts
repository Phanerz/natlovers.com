import {z} from "zod";

// Pure add-on types and helpers shared by the storefront, the admin and the
// server. Nothing here touches the database, so client components may import it.

// One flat colour, two colours side by side, or three colours side by side.
// There are no blends: every colour is a clear, hard-edged block, so a customer
// can tell a Tricolour from a Red & White at a glance.
export const ADDON_COLOUR_KINDS = ["solid", "two_tone", "three_tone"] as const;
export type AddonColourKind = (typeof ADDON_COLOUR_KINDS)[number];

// Reads a stored kind. Rows saved before gradients were dropped say "gradient";
// they become two or three blocks depending on how many colours they hold.
export function normalizeColourKind(kind: string, hexes: string[]): AddonColourKind {
  if (kind === "solid" || kind === "two_tone" || kind === "three_tone") return kind;
  return hexes.length >= 3 ? "three_tone" : hexes.length === 2 ? "two_tone" : "solid";
}

// Customer reference photos must be our own uploads, never an arbitrary link.
export function isReferenceImageUrl(url: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url);
}

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
  // Customers choose whether this animal is carried or sits on its own.
  carryOption: boolean;
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
  // Carried (held) or on its own, for animals that offer the choice.
  carry: z.enum(["carried", "alone"]).optional(),
  // Photos of the customer's own pet, person or house, for the studio to work from.
  images: z.array(z.string().url().max(600).refine(isReferenceImageUrl, "Photos must be uploaded here.")).max(3).optional(),
  // Older carts may still carry a note; nothing writes one any more.
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
  // "Carried" or "On its own", when the animal offers the choice.
  carryLabel: string | null;
  note: string | null;
  // The felted reference photo shown to the customer.
  imageUrl: string | null;
  // The customer's own photos of the pet, person or house to copy.
  referenceImages: string[];
  priceIdr: number;
  priceUsdCents: number;
};

// A CSS background for a swatch: one flat colour, or equal hard-edged blocks of
// each colour side by side. Never a blend.
export function addonSwatchBackground(kind: string, hexes: string[]): string {
  const stops = hexes.filter(Boolean);
  if (stops.length === 0) return "#cccccc";
  if (stops.length === 1 || kind === "solid") return stops[0];
  const parts = stops.map((hex, index) => `${hex} ${(index * 100) / stops.length}% ${((index + 1) * 100) / stops.length}%`);
  return `linear-gradient(90deg, ${parts.join(", ")})`;
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

// The two ways a carryable animal can sit on the piece.
export const CARRY_LABELS = {carried: "Carried", alone: "On its own"} as const;

export function defaultAddonPick(species: AddonSpeciesView): AddonPick | null {
  const colour = species.colours.find((entry) => entry.isDefault) ?? species.colours[0];
  if (!colour) return null;
  return {
    speciesId: species.id,
    colourId: colour.id,
    ...(species.poses[0] ? {poseId: species.poses[0].id} : {}),
    ...(species.carryOption ? {carry: "alone" as const} : {})
  };
}

// The priced, readable lines the cart shows for a set of picks. Display only:
// the server rebuilds them from the database when the order is placed.
export function buildAddonLines(catalogue: AddonCatalogue, picks: AddonPick[]) {
  const lines: {label: string; value: string; extraIdr: number; extraUsdCents: number; hex?: string; images?: string[]}[] = [];
  picks.forEach((pick, index) => {
    const species = catalogue.species.find((entry) => entry.id === pick.speciesId);
    if (!species) return;
    const described = describeAddonPick(species, pick);
    lines.push({
      label: `${species.name} ${index + 1}`,
      value: pick.note ? `${described.value} (note: ${pick.note})` : described.value,
      extraIdr: catalogue.priceIdr,
      extraUsdCents: catalogue.priceUsdCents,
      hex: described.hex,
      ...(pick.images?.length ? {images: pick.images} : {})
    });
  });
  return lines;
}

// Turns a pick into the readable receipt line the cart and order lists show.
export function describeAddonPick(species: AddonSpeciesView, pick: AddonPick) {
  const colour = species.colours.find((entry) => entry.id === pick.colourId);
  const pose = species.poses.find((entry) => entry.id === pick.poseId);
  const carry = species.carryOption && pick.carry ? CARRY_LABELS[pick.carry] : undefined;
  const value = [colour?.label, pose?.label, carry].filter(Boolean).join(" · ");
  return {value, hex: colour?.hexes[0], colour, pose};
}
