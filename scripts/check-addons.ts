// Read-only check of the add-on server rules against the real data. Writes nothing.
//   npx tsx scripts/check-addons.ts
process.loadEnvFile(".env.local");

async function main() {
  const {getAddonCatalogue, resolveAddonPicks} = await import("../lib/addons");
  const catalogue = await getAddonCatalogue();
  console.log(`species: ${catalogue.species.length}, price: ${catalogue.priceIdr} IDR / ${catalogue.priceUsdCents} cents, max ${catalogue.maxPerBag}`);

  const cow = catalogue.species.find((s) => s.slug === "cow");
  if (!cow) throw new Error("No cow found. Has the seed been run?");
  const good = {speciesId: cow.id, colourId: cow.colours[0].id, poseId: cow.poses[0].id};

  const ok = await resolveAddonPicks([{...good, images: ["https://evil.example.com/x.jpg", "https://abc123.public.blob.vercel-storage.com/a.jpg"]}]);
  console.log("valid pick ->", ok[0].speciesName, ok[0].colourLabel, ok[0].colourKind, ok[0].poseLabel, ok[0].priceIdr, ok[0].priceUsdCents, "photos kept:", ok[0].referenceImages.length);

  const expectFail = async (label: string, picks: Parameters<typeof resolveAddonPicks>[0]) => {
    try {
      await resolveAddonPicks(picks);
      console.log(`FAIL: ${label} was accepted`);
    } catch (error) {
      console.log(`ok: ${label} rejected: ${(error as Error).message}`);
    }
  };
  await expectFail("missing pose on cow", [{speciesId: cow.id, colourId: cow.colours[0].id}]);
  await expectFail("fake colour", [{...good, colourId: "nope"}]);
  await expectFail("fake species", [{...good, speciesId: "nope"}]);
  await expectFail("too many", Array.from({length: catalogue.maxPerBag + 1}, () => good));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
