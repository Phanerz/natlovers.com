// One-off data change, run it yourself:
//   npx tsx scripts/refine-addons.ts
// Brings an existing database in line with lib/addon-seed-data.ts:
// 1. Puts the animals in the new display order (anything not listed goes last).
// 2. Makes every listed colour use the shared colour library's shade, sets which
//    ones are shown directly (defaults) and which sit under "Other colours", and
//    adds the colours that are new.
// 3. Turns on the "Carried or on its own" choice for dogs, cats, birds and rabbits.
// 4. Removes only the colours named in REMOVED_COLOURS (Apricot, the Kangaroo and
//    Koala combinations, Grey / Dapple).
// Colours you added yourself in admin are left alone. Orders already placed keep
// their own frozen copy, so nothing in them changes. Safe to run twice.
process.loadEnvFile(".env.local");

import {and, eq, inArray} from "drizzle-orm";
import {CARRYABLE_SLUGS, REMOVED_COLOURS, SEED_COLOURS, SEED_SPECIES} from "../lib/addon-seed-data";

async function main() {
  const {db, addonColours, addonSpecies} = await import("../lib/db");

  const species = await db.select().from(addonSpecies);
  const bySlug = new Map(species.map((entry) => [entry.slug, entry]));

  // 1. Display order.
  let placed = 0;
  for (const [index, seed] of SEED_SPECIES.entries()) {
    const entry = bySlug.get(seed.slug);
    if (!entry) {
      console.warn(`No "${seed.slug}" in the database, skipped. (Run scripts/merge-other-dogs.ts first for Other dogs.)`);
      continue;
    }
    await db
      .update(addonSpecies)
      // Only ever switches the choice on for the listed animals, never off, so an animal you
      // turned it on for yourself in admin keeps it.
      .set({sortOrder: index, ...(CARRYABLE_SLUGS.includes(seed.slug) ? {carryOption: true} : {})})
      .where(eq(addonSpecies.id, entry.id));
    placed += 1;
  }
  const listed = new Set(SEED_SPECIES.map((seed) => seed.slug));
  let extra = SEED_SPECIES.length;
  for (const entry of species.filter((other) => !listed.has(other.slug)).sort((a, b) => a.sortOrder - b.sortOrder)) {
    await db.update(addonSpecies).set({sortOrder: extra}).where(eq(addonSpecies.id, entry.id));
    extra += 1;
  }

  // 2. Colours, one colour group at a time (Koala and Kangaroo share one).
  const groups = new Map<string, {groupId: string; defaults: Set<string>; labels: string[]}>();
  for (const seed of SEED_SPECIES) {
    const entry = bySlug.get(seed.slug);
    if (!entry) continue;
    const current = groups.get(entry.colourGroupId) ?? {groupId: entry.colourGroupId, defaults: new Set<string>(), labels: []};
    for (const label of seed.defaults) current.defaults.add(label);
    for (const label of [...seed.defaults, ...(seed.additional ?? [])]) {
      if (!current.labels.includes(label)) current.labels.push(label);
    }
    groups.set(entry.colourGroupId, current);
  }

  let updated = 0;
  let created = 0;
  for (const {groupId, defaults, labels} of groups.values()) {
    const existing = await db.select().from(addonColours).where(eq(addonColours.groupId, groupId));
    const byLabel = new Map(existing.map((colour) => [colour.label, colour]));
    for (const [index, label] of labels.entries()) {
      const colour = SEED_COLOURS[label];
      if (!colour) throw new Error(`No colour data for "${label}"`);
      const values = {kind: colour.kind, hexes: colour.hexes, isDefault: defaults.has(label), active: true, sortOrder: index};
      const found = byLabel.get(label);
      if (found) {
        await db.update(addonColours).set(values).where(eq(addonColours.id, found.id));
        updated += 1;
      } else {
        await db.insert(addonColours).values({groupId, label, ...values});
        created += 1;
      }
    }
  }

  // 3. The colours that were taken out.
  let removed = 0;
  for (const {group, labels} of REMOVED_COLOURS) {
    const member = SEED_SPECIES.find((seed) => seed.group === group);
    const entry = member ? bySlug.get(member.slug) : undefined;
    if (!entry) continue;
    const gone = await db
      .delete(addonColours)
      .where(and(eq(addonColours.groupId, entry.colourGroupId), inArray(addonColours.label, labels)))
      .returning({id: addonColours.id});
    removed += gone.length;
  }

  console.log(`Ordered ${placed} animals; ${updated} colours updated, ${created} added, ${removed} removed.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
