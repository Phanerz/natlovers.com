import type {ShopHandle, ShopMaterial, ShopShape} from "@/app/catalogue/shop-data";
import {
  type BagConfig,
  type CustomConfig,
  type CustomProductType,
  type DollConfig,
  customBagColours,
  customBagHandles,
  customBagShapes,
  defaultConfigFor,
  isCustomProductType
} from "@/lib/custom-studio";

// Seeds the product page's customiser from the actual product being viewed,
// not the Custom Studio's generic defaults  -  a customer configuring "this
// bag" should start from what they're looking at (its real shape/colour)
// and can change any of it from there, not restart from a Rectangle/Agel
// that has nothing to do with the product open in front of them. Size is
// not seeded: Custom Studio keeps its own independent Small/Medium/Large
// sizing, unrelated to this product's own assigned body (see
// lib/body-shapes.ts).
//
// Returns null for a product type Custom Studio doesn't cover at all  - 
// Accessories are made to fixed designs and were never offered as
// commissions (see customProductTypes in lib/custom-studio.ts)  -  which is
// what the product page uses to decide whether to show a customiser at all.
export function defaultConfigForProduct(product: {
  productType: string;
  shape: ShopShape | null;
  handle: ShopHandle | null;
  materials: ShopMaterial[];
}): CustomConfig | null {
  if (!isCustomProductType(product.productType)) {
    return null;
  }
  const productType = product.productType as CustomProductType;

  if (productType === "Bags") {
    const base = defaultConfigFor("Bags") as BagConfig;
    const knownColour = product.materials.find((material) =>
      customBagColours.some((colour) => colour.id === material)
    ) as typeof base.colour | undefined;
    return {
      ...base,
      shape: product.shape && (customBagShapes as string[]).includes(product.shape) ? product.shape : base.shape,
      colour: knownColour ?? base.colour,
      // Custom Studio's own form stopped asking for handle (see the comment
      // on bagConfigSchema in lib/custom-studio.ts), but the field itself is
      // still real and still priced/persisted end to end  -  the product page
      // is what sets it, seeded from the actual product's handle type.
      handle:
        product.handle && (customBagHandles as string[]).includes(product.handle) ? product.handle : customBagHandles[0]
    };
  }

  if (productType === "Dolls") {
    return defaultConfigFor("Dolls") as DollConfig;
  }

  // Apparels: the catalogue schema carries none of a garment/size/colour/
  // placement on the product row (see attributesForType in
  // lib/admin-products.ts)  -  nothing real to seed from, so the customiser
  // starts from Custom Studio's own defaults.
  return defaultConfigFor("Apparels");
}
