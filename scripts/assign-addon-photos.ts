// One-off tidy-up after the first seed. Run it yourself:
//   npx tsx scripts/assign-addon-photos.ts
// 1. Gives each of the 25 starter photos to the animal its filename names (a
//    first guess from the owner's own filenames, changeable per photo in
//    admin). Only photos that are still unassigned are touched.
// 2. Turns old "gradient" colours into plain two or three colour blocks.
// Safe to run twice.
process.loadEnvFile(".env.local");

import {and, eq, isNull} from "drizzle-orm";

type Target = {species: string; pose?: string; primary?: boolean; zoom?: number};

const PLAN: Record<string, Target[]> = {
  "horse-light-brown": [{species: "horse", primary: true}],
  "horse-dark-brown": [{species: "horse"}],
  deer: [{species: "deer", primary: true}],
  monkey: [{species: "monkey", primary: true}],
  dachshund: [{species: "dachshund", primary: true}],
  dachshunds: [{species: "dachshund"}],
  "cow-front": [{species: "cow", pose: "Front", primary: true}],
  "cow-side": [{species: "cow", pose: "Side"}],
  chicken: [{species: "chicken", primary: true}],
  chickens: [{species: "chicken"}],
  "hen-and-chick": [{species: "chicken"}],
  "cat-stand": [{species: "cat", primary: true}],
  "cat-loaf": [{species: "cat"}],
  "cat-lay": [{species: "cat"}],
  ducks: [{species: "duck", primary: true}],
  giraffe: [{species: "giraffe", primary: true}],
  kangaroos: [{species: "kangaroo", primary: true}],
  "kangaroo-koala": [
    {species: "koala", primary: true, zoom: 1.25},
    {species: "kangaroo", zoom: 1.25}
  ],
  doves: [{species: "dove", primary: true}],
  "rabbit-stand": [{species: "rabbit", pose: "Standing", primary: true}],
  "rabbit-loaf": [{species: "rabbit", pose: "Sitting"}],
  "elephant-front": [{species: "elephant", pose: "Front", primary: true}],
  "elephant-side": [{species: "elephant", pose: "Side"}],
  "shihtzu-poodle": [{species: "shih-tzu-poodle", primary: true}],
  // One group photo stands in for the dog breeds with no photo of their own, zoomed in.
  "buncha-dogs": [
    {species: "basset-hound", primary: true, zoom: 1.4},
    {species: "beagle", primary: true, zoom: 1.4},
    {species: "french-bulldog-boston-terrier", primary: true, zoom: 1.4},
    {species: "corgi", primary: true, zoom: 1.4}
  ]
};

async function main() {
  const {db, addonColours, addonImages, addonPoses, addonSpecies} = await import("../lib/db");

  const species = await db.select().from(addonSpecies);
  const poses = await db.select().from(addonPoses);
  const bySlug = new Map(species.map((entry) => [entry.slug, entry]));
  let assigned = 0;

  for (const [file, targets] of Object.entries(PLAN)) {
    const url = `/animals/${file}.jpeg`;
    const [row] = await db
      .select()
      .from(addonImages)
      .where(and(eq(addonImages.url, url), isNull(addonImages.speciesId)));
    if (!row) continue;

    for (const [index, target] of targets.entries()) {
      const entry = bySlug.get(target.species);
      if (!entry) {
        console.warn(`No species "${target.species}" for ${file}, skipped.`);
        continue;
      }
      const poseId = target.pose ? poses.find((pose) => pose.speciesId === entry.id && pose.label === target.pose)?.id ?? null : null;
      const values = {speciesId: entry.id, poseId, zoom: target.zoom ?? 1, isPrimary: Boolean(target.primary)};
      if (index === 0) {
        await db.update(addonImages).set(values).where(eq(addonImages.id, row.id));
      } else {
        await db.insert(addonImages).values({...values, url, caption: row.caption, sortOrder: row.sortOrder});
      }
      assigned += 1;
    }
  }

  const old = await db.select().from(addonColours).where(eq(addonColours.kind, "gradient"));
  for (const colour of old) {
    await db
      .update(addonColours)
      .set({kind: colour.hexes.length >= 3 ? "three_tone" : colour.hexes.length === 2 ? "two_tone" : "solid"})
      .where(eq(addonColours.id, colour.id));
  }

  console.log(`Assigned ${assigned} photo placements, converted ${old.length} gradient colours.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
