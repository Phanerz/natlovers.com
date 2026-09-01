import {eq} from "drizzle-orm";
import {db, products, bodyShapes} from "../lib/db";

// Three invented sample products, written directly against the DB (not
// through the admin UI, since the UI flow isn't what's being tested here).
// The originals were permanently deleted while testing the new delete
// feature; nothing recoverable exists in git history, so these names,
// descriptions, and prices are made up, chosen only to be plausible for a
// handmade natural fiber bag brand. The images are real, pre-existing
// product photography already in /public/images that isn't referenced by
// any current page (natlovers-bags-1.jpg is already in use as the hero
// poster, so it's excluded here).
const SAMPLE_PRODUCTS = [
  {
    slug: "rumah-enceng-cottage-bag",
    name: "Rumah Enceng Cottage Bag",
    priceIdr: 425000,
    shortDescription: "A miniature woven cottage, hand-shaped from water hyacinth with a leather-look handle.",
    description:
      "Woven entirely from dried water hyacinth (eceng gondok) over a structured house-shaped frame, complete with hand-painted window and roof detail. Each cottage bag is shaped and finished by hand in our Yogyakarta workshop, so no two are perfectly identical.",
    images: ["/images/tas-rumah-natural.png"],
    bodyShapeName: "Rumah Enceng",
    size: "Small",
    shape: "House Shaped",
    handleType: "Handbag",
    materials: ["Water Hyacinth"],
    productType: "Bags",
    tags: ["cottage", "novelty", "water-hyacinth"]
  },
  {
    slug: "garden-bloom-bucket-bag",
    name: "Garden Bloom Bucket Bag",
    priceIdr: 650000,
    shortDescription: "A round woven bucket bag topped with a hand-crocheted garden of flowers, pompoms, and a bee.",
    description:
      "A natural fiber bucket bag finished with a full ring of hand-crocheted cotton flowers, pompoms, and a tiny embroidered bee and butterfly. The braided carry handles are long enough to wear over the shoulder or carry by hand.",
    images: ["/images/natlovers-bags-2.webp"],
    bodyShapeName: "Bumbung (BBG)",
    size: "Medium",
    shape: "Round",
    handleType: "Shoulder Bag",
    materials: ["Agel"],
    productType: "Bags",
    tags: ["floral", "crochet", "statement"]
  },
  {
    slug: "sunshine-doll-tote",
    name: "Sunshine Doll Tote",
    priceIdr: 580000,
    shortDescription: "A sunny yellow crochet tote dressed with a row of hand-sewn Natlovers dolls.",
    description:
      "A structured rectangular tote crocheted in bright yellow fiber, with a row of Natlovers' signature hand-sewn fabric dolls stitched across the front, each in its own embroidered outfit. Sturdy braided handles carry comfortably by hand.",
    images: ["/images/natlovers-bags-4.webp"],
    bodyShapeName: "Kotak panjang/soping",
    size: "Medium",
    shape: "Rectangle",
    handleType: "Handbag",
    materials: ["Woven Fabric"],
    productType: "Bags",
    tags: ["dolls", "signature", "tote"]
  }
] as const;

async function main() {
  for (const sample of SAMPLE_PRODUCTS) {
    const [existing] = await db.select({id: products.id}).from(products).where(eq(products.slug, sample.slug));
    if (existing) {
      console.log(`Skipping "${sample.slug}", already exists.`);
      continue;
    }

    const [body] = await db.select({id: bodyShapes.id}).from(bodyShapes).where(eq(bodyShapes.name, sample.bodyShapeName));
    if (!body) {
      throw new Error(`Body shape "${sample.bodyShapeName}" not found, aborting.`);
    }

    const {bodyShapeName, images, materials, tags, ...rest} = sample;
    await db.insert(products).values({
      ...rest,
      images: [...images],
      materials: [...materials],
      tags: [...tags],
      bodyShapeId: body.id,
      hasBaseColour: false,
      hasHandleColour: false,
      hasPersonalisation: false,
      status: "active",
      isActive: true,
      publishedAt: new Date(),
      stock: 2,
      lowStockThreshold: 1
    });
    console.log(`Inserted "${sample.name}" (${sample.slug}).`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
