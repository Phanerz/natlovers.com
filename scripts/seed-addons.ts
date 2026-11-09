// One-off seed for the add-on tables. Run it yourself after the 0035 migration:
//   npx tsx scripts/seed-addons.ts
// Safe to run twice: it does nothing if any species already exists. Photos are
// filed as an unassigned library; assign them to species in admin.
process.loadEnvFile(".env.local");

import {CARRYABLE_SLUGS, SEED_COLOURS, SEED_IMAGE_FILES, SEED_SPECIES} from "../lib/addon-seed-data";

async function main() {
  const {db, addonColourGroups, addonColours, addonImages, addonPoses, addonSettings, addonSpecies} = await import("../lib/db");

  const existing = await db.select({id: addonSpecies.id}).from(addonSpecies).limit(1);
  if (existing.length) {
    console.log("Species already exist, nothing seeded.");
    process.exit(0);
  }

  await db.insert(addonSettings).values({id: "default"}).onConflictDoNothing();

  const groupIds = new Map<string, string>();
  let order = 0;
  for (const species of SEED_SPECIES) {
    let groupId = groupIds.get(species.group);
    if (!groupId) {
      const [group] = await db.insert(addonColourGroups).values({name: species.group}).returning({id: addonColourGroups.id});
      groupId = group.id;
      groupIds.set(species.group, groupId);
      // A shared group is filled once, from the union of its species.
      const members = SEED_SPECIES.filter((member) => member.group === species.group);
      const defaults = new Set(members.flatMap((member) => member.defaults));
      const labels = Array.from(new Set(members.flatMap((member) => [...member.defaults, ...(member.additional ?? [])])));
      await db.insert(addonColours).values(
        labels.map((label, index) => {
          const colour = SEED_COLOURS[label];
          if (!colour) throw new Error(`No colour data for "${label}"`);
          return {groupId: groupId!, label, kind: colour.kind, hexes: colour.hexes, isDefault: defaults.has(label), sortOrder: index};
        })
      );
    }

    const [row] = await db
      .insert(addonSpecies)
      .values({
        name: species.name,
        slug: species.slug,
        colourGroupId: groupId,
        poseLabel: species.poseLabel ?? null,
        carryOption: CARRYABLE_SLUGS.includes(species.slug),
        sortOrder: order++
      })
      .returning({id: addonSpecies.id});

    if (species.poses?.length) {
      await db.insert(addonPoses).values(species.poses.map((label, index) => ({speciesId: row.id, label, sortOrder: index})));
    }
  }

  await db.insert(addonImages).values(
    SEED_IMAGE_FILES.map((file, index) => ({url: `/animals/${file}.jpeg`, caption: file.replace(/-/g, " "), sortOrder: index}))
  );

  console.log(`Seeded ${SEED_SPECIES.length} species, ${groupIds.size} colour groups, ${SEED_IMAGE_FILES.length} unassigned photos.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
