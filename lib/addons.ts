import {asc, eq, inArray} from "drizzle-orm";
import {
  addonColourGroups,
  addonColours,
  addonImages,
  addonPoses,
  addonSettings,
  addonSpecies,
  db,
  orderItemAddons
} from "@/lib/db";
import {
  ADDON_COLOUR_KINDS,
  type AddonCatalogue,
  type AddonColourKind,
  type AddonColourView,
  type AddonImageView,
  type AddonOrderLine,
  type AddonPick,
  type AddonSpeciesView,
  pickAddonImage
} from "@/lib/addon-shared";
import type {ResolvedLine} from "@/lib/product-options";

const DEFAULT_SETTINGS = {priceIdr: 180000, priceUsdCents: 1000, maxPerBag: 4};

export async function getAddonSettings() {
  const [row] = await db.select().from(addonSettings).where(eq(addonSettings.id, "default"));
  return row ? {priceIdr: row.priceIdr, priceUsdCents: row.priceUsdCents, maxPerBag: row.maxPerBag} : DEFAULT_SETTINGS;
}

function asKind(value: string): AddonColourKind {
  return (ADDON_COLOUR_KINDS as readonly string[]).includes(value) ? (value as AddonColourKind) : "solid";
}

// Every species with its colours, poses and photos. `onlyActive` is the
// storefront view: inactive species and inactive colours are left out. Admin
// asks for everything.
export async function getAddonSpecies(onlyActive: boolean): Promise<AddonSpeciesView[]> {
  const [species, colours, poses, images] = await Promise.all([
    db.select().from(addonSpecies).orderBy(asc(addonSpecies.sortOrder), asc(addonSpecies.name)),
    db.select().from(addonColours).orderBy(asc(addonColours.sortOrder), asc(addonColours.label)),
    db.select().from(addonPoses).orderBy(asc(addonPoses.sortOrder)),
    db.select().from(addonImages).orderBy(asc(addonImages.sortOrder))
  ]);

  const coloursByGroup = new Map<string, AddonColourView[]>();
  for (const colour of colours) {
    if (onlyActive && !colour.active) continue;
    const list = coloursByGroup.get(colour.groupId) ?? [];
    list.push({
      id: colour.id,
      label: colour.label,
      kind: asKind(colour.kind),
      hexes: colour.hexes,
      isDefault: colour.isDefault,
      active: colour.active
    });
    coloursByGroup.set(colour.groupId, list);
  }

  return species
    .filter((entry) => !onlyActive || entry.active)
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      name: entry.name,
      slug: entry.slug,
      active: entry.active,
      poseLabel: entry.poseLabel,
      colourGroupId: entry.colourGroupId,
      colours: coloursByGroup.get(entry.colourGroupId) ?? [],
      poses: poses.filter((pose) => pose.speciesId === entry.id).map((pose) => ({id: pose.id, label: pose.label})),
      images: images
        .filter((image) => image.speciesId === entry.id)
        .map<AddonImageView>((image) => ({
          id: image.id,
          url: image.url,
          poseId: image.poseId,
          colourId: image.colourId,
          zoom: image.zoom,
          isPrimary: image.isPrimary
        }))
    }))
    .filter((entry) => !onlyActive || entry.colours.length > 0);
}

// The storefront view. If the add-on tables are not there yet (the migration
// has not been run), the product page simply shows no add-ons instead of failing.
export async function getAddonCatalogue(): Promise<AddonCatalogue> {
  try {
    const [settings, species] = await Promise.all([getAddonSettings(), getAddonSpecies(true)]);
    return {...settings, species};
  } catch (error) {
    console.error("Add-on catalogue unavailable", error);
    return {...DEFAULT_SETTINGS, species: []};
  }
}

export async function getAddonColourGroups() {
  return db.select().from(addonColourGroups).orderBy(asc(addonColourGroups.name));
}

export async function getAddonLibrary() {
  return db.select().from(addonImages).orderBy(asc(addonImages.sortOrder));
}

// Checks every pick against the live admin data and prices it at the flat
// rate. Throws a plain message the checkout can show. Nothing the client sent
// about names, colours or prices is believed.
export async function resolveAddonPicks(picks: AddonPick[]): Promise<AddonOrderLine[]> {
  if (!picks.length) return [];
  const settings = await getAddonSettings();
  if (picks.length > settings.maxPerBag) {
    throw new Error(`A bag can carry at most ${settings.maxPerBag} add-ons.`);
  }
  const species = await getAddonSpecies(true);
  const bySpecies = new Map(species.map((entry) => [entry.id, entry]));

  return picks.map((pick) => {
    const entry = bySpecies.get(pick.speciesId);
    if (!entry) throw new Error("One of the add-ons you chose is no longer available. Please choose it again.");
    const colour = entry.colours.find((candidate) => candidate.id === pick.colourId);
    if (!colour) throw new Error(`The colour you chose for the ${entry.name} is no longer available.`);
    let poseLabel: string | null = null;
    if (entry.poses.length) {
      const pose = entry.poses.find((candidate) => candidate.id === pick.poseId);
      if (!pose) throw new Error(`Please choose a ${entry.poseLabel?.toLowerCase() ?? "pose"} for the ${entry.name}.`);
      poseLabel = pose.label;
    }
    const image = pickAddonImage(entry, pick.poseId ?? null, colour.id);
    return {
      speciesId: entry.id,
      speciesName: entry.name,
      colourLabel: colour.label,
      colourKind: colour.kind,
      colourHexes: colour.hexes,
      poseLabel,
      note: pick.note?.trim() || null,
      imageUrl: image?.url ?? null,
      priceIdr: settings.priceIdr,
      priceUsdCents: settings.priceUsdCents
    };
  });
}

// The receipt line the cart, the account page and the admin order list show.
export function addonOrderLineToResolved(line: AddonOrderLine, index: number): ResolvedLine {
  const value = [line.colourLabel, line.poseLabel].filter(Boolean).join(" · ");
  return {
    label: `${line.speciesName} ${index + 1}`,
    value: line.note ? `${value} (note: ${line.note})` : value,
    extraIdr: line.priceIdr,
    extraUsdCents: line.priceUsdCents,
    hex: line.colourHexes[0]
  };
}

export async function saveOrderItemAddons(orderItemId: string, lines: AddonOrderLine[]) {
  if (!lines.length) return;
  await db.insert(orderItemAddons).values(lines.map((line, index) => ({...line, orderItemId, sortOrder: index})));
}

export type OrderAddonRow = AddonOrderLine & {id: string; orderItemId: string};

export async function getOrderAddons(orderItemIds: string[]): Promise<Map<string, OrderAddonRow[]>> {
  const result = new Map<string, OrderAddonRow[]>();
  if (!orderItemIds.length) return result;
  let rows: (typeof orderItemAddons.$inferSelect)[];
  try {
    rows = await db
      .select()
      .from(orderItemAddons)
      .where(inArray(orderItemAddons.orderItemId, orderItemIds))
      .orderBy(asc(orderItemAddons.sortOrder));
  } catch (error) {
    // Before the migration is run the table does not exist; orders still load without add-ons.
    console.error("Order add-ons unavailable", error);
    return result;
  }
  for (const row of rows) {
    const list = result.get(row.orderItemId) ?? [];
    list.push({
      id: row.id,
      orderItemId: row.orderItemId,
      speciesId: row.speciesId,
      speciesName: row.speciesName,
      colourLabel: row.colourLabel,
      colourKind: asKind(row.colourKind),
      colourHexes: row.colourHexes,
      poseLabel: row.poseLabel,
      note: row.note,
      imageUrl: row.imageUrl,
      priceIdr: row.priceIdr,
      priceUsdCents: row.priceUsdCents
    });
    result.set(row.orderItemId, list);
  }
  return result;
}
