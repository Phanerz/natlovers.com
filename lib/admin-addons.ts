import {and, eq, ne} from "drizzle-orm";
import {z} from "zod";
import {addonColourGroups, addonColours, addonImages, addonPoses, addonSettings, addonSpecies, db} from "@/lib/db";
import {ADDON_COLOUR_KINDS} from "@/lib/addon-shared";
import {getAddonColourGroups, getAddonLibrary, getAddonSettings, getAddonSpecies} from "@/lib/addons";

// Admin-side reads and writes for the add-on system. Every write is a small,
// named operation validated here; the route only authenticates and dispatches.

const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Colours must be a hex code such as #7a4e2d.");

const ops = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("settings"),
    priceIdr: z.number().int().min(0).max(100_000_000),
    priceUsdCents: z.number().int().min(0).max(10_000_000),
    maxPerBag: z.number().int().min(1).max(8)
  }),
  z.object({
    op: z.literal("species.create"),
    name: z.string().trim().min(1).max(80),
    kind: z.enum(["animal", "doll"]).default("animal"),
    // Share another species' colour list, or omit to start an empty list of its own.
    shareColoursWith: z.string().trim().max(64).optional()
  }),
  z.object({
    op: z.literal("species.update"),
    id: z.string().min(1).max(64),
    name: z.string().trim().min(1).max(80).optional(),
    active: z.boolean().optional(),
    poseLabel: z.string().trim().max(40).nullable().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
    // Move this species onto its own copy of a colour list, or onto a shared one.
    colourGroupId: z.string().min(1).max(64).optional(),
    detachColours: z.boolean().optional()
  }),
  z.object({op: z.literal("species.delete"), id: z.string().min(1).max(64)}),
  z.object({
    op: z.literal("colour.save"),
    id: z.string().min(1).max(64).optional(),
    groupId: z.string().min(1).max(64),
    label: z.string().trim().min(1).max(60),
    kind: z.enum(ADDON_COLOUR_KINDS),
    hexes: z.array(hex).min(1).max(3),
    isDefault: z.boolean().default(false),
    active: z.boolean().default(true)
  }),
  z.object({op: z.literal("colour.delete"), id: z.string().min(1).max(64)}),
  z.object({
    op: z.literal("pose.save"),
    id: z.string().min(1).max(64).optional(),
    speciesId: z.string().min(1).max(64),
    label: z.string().trim().min(1).max(40)
  }),
  z.object({op: z.literal("pose.delete"), id: z.string().min(1).max(64)}),
  z.object({
    op: z.literal("image.assign"),
    id: z.string().min(1).max(64),
    speciesId: z.string().max(64).nullable(),
    poseId: z.string().max(64).nullable(),
    colourId: z.string().max(64).nullable(),
    zoom: z.number().min(1).max(3),
    isPrimary: z.boolean()
  }),
  z.object({op: z.literal("image.delete"), id: z.string().min(1).max(64)})
]);

export type AdminAddonOp = z.infer<typeof ops>;

export async function getAddonAdminData() {
  const [settings, species, groups, library] = await Promise.all([
    getAddonSettings(),
    getAddonSpecies(false),
    getAddonColourGroups(),
    getAddonLibrary()
  ]);
  return {
    settings,
    species,
    groups: groups.map((group) => ({id: group.id, name: group.name})),
    library: library.map((image) => ({
      id: image.id,
      url: image.url,
      caption: image.caption,
      speciesId: image.speciesId,
      poseId: image.poseId,
      colourId: image.colourId,
      zoom: image.zoom,
      isPrimary: image.isPrimary
    }))
  };
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(name: string) {
  const base = slugify(name) || "species";
  let slug = base;
  for (let n = 2; ; n += 1) {
    const [taken] = await db.select({id: addonSpecies.id}).from(addonSpecies).where(eq(addonSpecies.slug, slug));
    if (!taken) return slug;
    slug = `${base}-${n}`;
  }
}

export async function runAddonOp(input: unknown): Promise<void> {
  const parsed = ops.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "That change is not valid.");
  }
  const op = parsed.data;

  switch (op.op) {
    case "settings": {
      await db
        .insert(addonSettings)
        .values({id: "default", priceIdr: op.priceIdr, priceUsdCents: op.priceUsdCents, maxPerBag: op.maxPerBag})
        .onConflictDoUpdate({
          target: addonSettings.id,
          set: {priceIdr: op.priceIdr, priceUsdCents: op.priceUsdCents, maxPerBag: op.maxPerBag, updatedAt: new Date()}
        });
      return;
    }
    case "species.create": {
      let groupId: string;
      if (op.shareColoursWith) {
        const [other] = await db.select().from(addonSpecies).where(eq(addonSpecies.id, op.shareColoursWith));
        if (!other) throw new Error("The species to share colours with was not found.");
        groupId = other.colourGroupId;
      } else {
        const [group] = await db.insert(addonColourGroups).values({name: op.name}).returning({id: addonColourGroups.id});
        groupId = group.id;
      }
      const existing = await db.select({id: addonSpecies.id}).from(addonSpecies);
      await db.insert(addonSpecies).values({
        name: op.name,
        slug: await uniqueSlug(op.name),
        kind: op.kind,
        colourGroupId: groupId,
        sortOrder: existing.length
      });
      return;
    }
    case "species.update": {
      const {id, detachColours, ...rest} = op;
      const set: Partial<typeof addonSpecies.$inferInsert> = {};
      if (rest.name !== undefined) set.name = rest.name;
      if (rest.active !== undefined) set.active = rest.active;
      if (rest.poseLabel !== undefined) set.poseLabel = rest.poseLabel;
      if (rest.sortOrder !== undefined) set.sortOrder = rest.sortOrder;
      if (rest.colourGroupId !== undefined) set.colourGroupId = rest.colourGroupId;
      if (detachColours) {
        // Give this species its own copy of the list it was sharing, so editing
        // one animal's colours stops changing the other's.
        const [species] = await db.select().from(addonSpecies).where(eq(addonSpecies.id, id));
        if (!species) throw new Error("Species not found.");
        const [group] = await db.insert(addonColourGroups).values({name: species.name}).returning({id: addonColourGroups.id});
        const colours = await db.select().from(addonColours).where(eq(addonColours.groupId, species.colourGroupId));
        if (colours.length) {
          await db.insert(addonColours).values(
            colours.map((colour) => ({
              groupId: group.id,
              label: colour.label,
              kind: colour.kind,
              hexes: colour.hexes,
              isDefault: colour.isDefault,
              active: colour.active,
              sortOrder: colour.sortOrder
            }))
          );
        }
        set.colourGroupId = group.id;
      }
      if (Object.keys(set).length) await db.update(addonSpecies).set(set).where(eq(addonSpecies.id, id));
      return;
    }
    case "species.delete": {
      await db.delete(addonSpecies).where(eq(addonSpecies.id, op.id));
      return;
    }
    case "colour.save": {
      if (op.kind === "two_tone" && op.hexes.length !== 2) throw new Error("A two-tone colour needs exactly two colours.");
      if (op.kind === "three_tone" && op.hexes.length !== 3) throw new Error("A three-tone colour needs exactly three colours.");
      if (op.kind === "solid" && op.hexes.length !== 1) throw new Error("A solid colour has exactly one colour.");
      const values = {groupId: op.groupId, label: op.label, kind: op.kind, hexes: op.hexes, isDefault: op.isDefault, active: op.active};
      if (op.id) {
        await db.update(addonColours).set(values).where(eq(addonColours.id, op.id));
      } else {
        const siblings = await db.select({id: addonColours.id}).from(addonColours).where(eq(addonColours.groupId, op.groupId));
        await db.insert(addonColours).values({...values, sortOrder: siblings.length});
      }
      return;
    }
    case "colour.delete": {
      await db.delete(addonColours).where(eq(addonColours.id, op.id));
      return;
    }
    case "pose.save": {
      if (op.id) {
        await db.update(addonPoses).set({label: op.label}).where(eq(addonPoses.id, op.id));
      } else {
        const siblings = await db.select({id: addonPoses.id}).from(addonPoses).where(eq(addonPoses.speciesId, op.speciesId));
        await db.insert(addonPoses).values({speciesId: op.speciesId, label: op.label, sortOrder: siblings.length});
        const [species] = await db.select().from(addonSpecies).where(eq(addonSpecies.id, op.speciesId));
        if (species && !species.poseLabel) await db.update(addonSpecies).set({poseLabel: "Pose"}).where(eq(addonSpecies.id, op.speciesId));
      }
      return;
    }
    case "pose.delete": {
      await db.delete(addonPoses).where(eq(addonPoses.id, op.id));
      return;
    }
    case "image.assign": {
      const {id, ...values} = op;
      void id;
      await db
        .update(addonImages)
        .set({
          speciesId: values.speciesId,
          // A pose or colour only means something inside its own species.
          poseId: values.speciesId ? values.poseId : null,
          colourId: values.speciesId ? values.colourId : null,
          zoom: values.zoom,
          isPrimary: values.isPrimary
        })
        .where(eq(addonImages.id, op.id));
      // Exactly one primary photo per species.
      if (values.isPrimary && values.speciesId) {
        await db
          .update(addonImages)
          .set({isPrimary: false})
          .where(and(eq(addonImages.speciesId, values.speciesId), ne(addonImages.id, op.id)));
      }
      return;
    }
    case "image.delete": {
      await db.delete(addonImages).where(eq(addonImages.id, op.id));
      return;
    }
  }
}
