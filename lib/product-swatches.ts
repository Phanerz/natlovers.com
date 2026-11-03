import type {ColourOption} from "@/lib/colour-library";
import type {ShopProduct} from "@/app/catalogue/shop-data";

// The colours a catalogue card shows under the price: this product's own
// handle colours (the part of a bag that actually varies), or its base colours
// when it has no handle colour choice  -  only what the product really offers,
// never the whole library, in the order the admin arranged them.
export function swatchesForProduct(product: Pick<ShopProduct, "hasBaseColour" | "baseColourOptions" | "hasHandleColour" | "handleColourOptions">): ColourOption[] {
  const handle = product.hasHandleColour ? (product.handleColourOptions ?? []) : [];
  const base = product.hasBaseColour ? (product.baseColourOptions ?? []) : [];
  const source = handle.length ? handle : base;

  const seen = new Set<string>();
  return source.filter((option) => {
    const key = option.label.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// The product's photographs, main image first, without repeats.
export function galleryImagesFor(product: Pick<ShopProduct, "imageUrl" | "images">): string[] {
  const all = [product.imageUrl, ...(product.images ?? [])].filter((url): url is string => Boolean(url));
  return Array.from(new Set(all));
}
