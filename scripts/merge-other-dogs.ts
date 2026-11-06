// One-off data change, run it yourself:
//   npx tsx scripts/merge-other-dogs.ts
// 1. Replaces Basset Hound, Beagle, French Bulldog / Boston Terrier and Corgi
//    with one "Other dogs" animal. The kind of dog is a "Breed" choice, and the
//    colour list is all four breeds' colours together.
// 2. Points the Koala at the new koala-only photo.
// The four old animals are deleted. Orders already placed keep their own
// frozen copy of what was chosen, so nothing in them changes. Safe to run twice.
process.loadEnvFile(".env.local");

import {eq, inArray} from "drizzle-orm";
import {SEED_COLOURS, SEED_SPECIES} from "../lib/addon-seed-data";

const OLD_SLUGS = ["basset-hound", "beagle", "french-bulldog-boston-terrier", "corgi"];

async function main() {
  const {db, addonColourGroups, addonColours, addonImages, addonPoses, addonSpecies} = await import("../lib/db");

  const seed = SEED_SPECIES.find((entry) => entry.slug === "other-dogs");
  if (!seed) throw new Error("Seed data for Other dogs is missing.");

  const [existing] = await db.select().from(addonSpecies).where(eq(addonSpecies.slug, "other-dogs"));
  if (existing) {
    console.log("Other dogs already exists, skipping the dog merge.");
  } else {
    const old = await db.select().from(addonSpecies).where(inArray(addonSpecies.slug, OLD_SLUGS));
    const sortOrder = old.length ? Math.min(...old.map((entry) => entry.sortOrder)) : 100;

    const [group] = await db.insert(addonColourGroups).values({name: "other-dogs"}).returning({id: addonColourGroups.id});
    const labels = seed.defaults;
    await db.insert(addonColours).values(
      labels.map((label, index) => {
        const colour = SEED_COLOURS[label];
        if (!colour) throw new Error(`No colour data for "${label}"`);
        return {groupId: group.id, label, kind: colour.kind, hexes: colour.hexes, isDefault: true, sortOrder: index};
      })
    );

    const [species] = await db
      .insert(addonSpecies)
      .values({name: seed.name, slug: seed.slug, colourGroupId: group.id, poseLabel: seed.poseLabel ?? null, sortOrder})
      .returning({id: addonSpecies.id});
    await db.insert(addonPoses).values((seed.poses ?? []).map((label, index) => ({speciesId: species.id, label, sortOrder: index})));

    // Photos: keep one copy of each distinct picture for the new animal, drop the rest.
    const oldIds = old.map((entry) => entry.id);
    if (oldIds.length) {
      const images = await db.select().from(addonImages).where(inArray(addonImages.speciesId, oldIds));
      const seen = new Set<string>();
      for (const image of images) {
        if (seen.has(image.url)) {
          await db.delete(addonImages).where(eq(addonImages.id, image.id));
          continue;
        }
        seen.add(image.url);
        await db
          .update(addonImages)
          .set({speciesId: species.id, poseId: null, colourId: null, isPrimary: seen.size === 1, zoom: Math.min(image.zoom, 1.3)})
          .where(eq(addonImages.id, image.id));
      }

      const groupIds = Array.from(new Set(old.map((entry) => entry.colourGroupId)));
      await db.delete(addonSpecies).where(inArray(addonSpecies.id, oldIds));
      await db.delete(addonColourGroups).where(inArray(addonColourGroups.id, groupIds));
    }
    console.log(`Created Other dogs with ${labels.length} colours and ${seed.poses?.length ?? 0} breeds; removed ${old.length} old dog entries.`);
  }

  // Koala: the koala-only crop instead of the shared kangaroo and koala photo.
  const [koala] = await db.select().from(addonSpecies).where(eq(addonSpecies.slug, "koala"));
  if (koala) {
    const rows = await db.select().from(addonImages).where(eq(addonImages.speciesId, koala.id));
    for (const row of rows) {
      if (row.url === "/animals/kangaroo-koala.jpeg") {
        await db.update(addonImages).set({url: "/animals/koala.jpeg", zoom: 1}).where(eq(addonImages.id, row.id));
        console.log("Koala now uses the koala-only photo.");
      }
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
