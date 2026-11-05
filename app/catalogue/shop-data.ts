import type {ColourOption} from "@/lib/colour-library";
import {Locale} from "@/lib/site";

export type ShopMaterial = "Agel" | "Mendong" | "Water Hyacinth" | "Gajih" | "Woven Fabric" | "Patchwork";

// A coarse, admin-assigned browsing tag for Bags/Dolls  -  independent of a
// product's real dimensions, which live on its assigned body (see
// lib/body-shapes.ts and products.bodyShapeId in lib/db/schema.ts). Also
// reused as-is by Custom Studio's own commission-intake sizing (see
// lib/custom-studio.ts), an unrelated system that happens to share the same
// three-value vocabulary.
export type ShopSize = "Small" | "Medium" | "Large";

export type ShopShape = "Rectangle" | "Round" | "House Shaped" | "Other";

export type ShopHandle = "Handbag" | "Shoulder Bag" | "Sling Bag" | "Clutch" | "Rucksack";

export type AccessoryCategory = "Bracelet" | "Charm" | "Necklace";

export type ShopProductType = "Bags" | "Dolls" | "Accessories" | "Apparels";

// Each product type owns its own attribute set  -  a Doll has only size, an
// Accessory has only category, Apparel has none of these. Every per-type
// field is nullable rather than the product carrying irrelevant fields from
// a different type.
export type ShopProduct = {
  slug: string;
  name: string;
  priceIdr: number;
  // The fixed dollar price, in cents (see lib/pricing.ts).
  priceUsdCents?: number | null;
  imageUrl: string;
  productType: ShopProductType;
  size: ShopSize | null;
  shape: ShopShape | null;
  // The first of `handles`, kept for the single-handle consumers (Custom
  // Studio matching, card pill).
  handle: ShopHandle | null;
  // A bag can carry several handle types at once (e.g. Handbag + Shoulder Bag).
  handles: ShopHandle[];
  materials: ShopMaterial[];
  accessoryCategory: AccessoryCategory | null;
  soldOut?: boolean;
  // The catalogue also receives these (they ride along on the product record):
  // the full photo gallery and the colours the product offers, used for the
  // swipeable card gallery and the swatches under the price.
  images?: string[];
  hasBaseColour?: boolean;
  baseColourOptions?: ColourOption[];
  // Admin-built extras (see lib/product-options.ts); null/absent = none.
  customisation?: import("@/lib/product-options").ProductOptions | null;
  hasHandleColour?: boolean;
  handleColourOptions?: ColourOption[];
};

type BilingualLabel = {en: string; id: string};

// Fixed, literal display order per group  -  Size stays in its given logical
// order, everything else listed here is already alphabetical (by English
// label) and stays fixed regardless of locale.
export const bagMaterials: ShopMaterial[] = ["Agel", "Gajih", "Mendong", "Patchwork", "Water Hyacinth", "Woven Fabric"];
export const shopSizes: ShopSize[] = ["Small", "Medium", "Large"];
export const shopShapes: ShopShape[] = ["House Shaped", "Rectangle", "Round", "Other"];
export const shopHandles: ShopHandle[] = ["Clutch", "Handbag", "Shoulder Bag", "Sling Bag", "Rucksack"];
export const accessoryCategories: AccessoryCategory[] = ["Bracelet", "Charm", "Necklace"];

export const materialLabels: Record<ShopMaterial, BilingualLabel> = {
  Agel: {en: "Agel", id: "Agel"},
  Mendong: {en: "Mendong", id: "Mendong"},
  "Water Hyacinth": {en: "Water Hyacinth", id: "Enceng Gondok"},
  Gajih: {en: "Gajih", id: "Gajih"},
  "Woven Fabric": {en: "Tenun", id: "Tenun"},
  Patchwork: {en: "Patchwork", id: "Patchwork"}
};

export const sizeLabels: Record<ShopSize, BilingualLabel> = {
  Small: {en: "Small", id: "Kecil"},
  Medium: {en: "Medium", id: "Sedang"},
  Large: {en: "Large", id: "Besar"}
};

export const shapeLabels: Record<ShopShape, BilingualLabel> = {
  Rectangle: {en: "Rectangle", id: "Persegi Panjang"},
  Round: {en: "Round", id: "Bulat"},
  "House Shaped": {en: "House Shaped", id: "Bentuk Rumah"},
  Other: {en: "Other / Irregular", id: "Lainnya / Tidak Beraturan"}
};

export const handleLabels: Record<ShopHandle, BilingualLabel> = {
  Handbag: {en: "Handbag", id: "Jinjing"},
  "Shoulder Bag": {en: "Shoulder Bag", id: "Bahu"},
  "Sling Bag": {en: "Sling Bag", id: "Slempang"},
  Clutch: {en: "Clutch", id: "Clutch"},
  Rucksack: {en: "Rucksack", id: "Ransel"}
};

export const accessoryCategoryLabels: Record<AccessoryCategory, BilingualLabel> = {
  Bracelet: {en: "Bracelet", id: "Gelang"},
  Charm: {en: "Charm", id: "Liontin"},
  Necklace: {en: "Necklace", id: "Kalung"}
};

export const shopProductTypes: ShopProductType[] = ["Bags", "Dolls", "Accessories", "Apparels"];

export const productTypeLabels: Record<ShopProductType, BilingualLabel> = {
  Bags: {en: "Bags", id: "Tas"},
  Dolls: {en: "Dolls", id: "Boneka"},
  Accessories: {en: "Accessories", id: "Aksesoris"},
  Apparels: {en: "Apparels", id: "Pakaian"}
};

type TagStyle = {bg: string; border: string; text: string};

export const sizePillStyle: TagStyle = {bg: "#DCE6EA", border: "#B8CDD4", text: "#2A3D42"};
export const shapePillStyle: TagStyle = {bg: "#E3E8D4", border: "#C4CDAA", text: "#3A4526"};
export const handlePillStyle: TagStyle = {bg: "#F3E2D6", border: "#DEBBA3", text: "#5A3A22"};
export const categoryPillStyle: TagStyle = {bg: "#EDE3EF", border: "#D2BCD8", text: "#4A2E52"};

export const materialImageStyle: Record<ShopMaterial, {bg: string; border: string}> = {
  Agel: {bg: "#EFE3CE", border: "#D3BFA0"},
  Mendong: {bg: "#EBE5CC", border: "#CFC59B"},
  "Water Hyacinth": {bg: "#E1EADD", border: "#B9CBB4"},
  Gajih: {bg: "#F3E2D6", border: "#DEBBA3"},
  "Woven Fabric": {bg: "#E7DEEC", border: "#C9B9DA"},
  Patchwork: {bg: "#F0DEE0", border: "#DEBBBF"}
};

export const DEFAULT_IMAGE_STYLE = {bg: "#eee7d8", border: "#d9cfc0"};

// A bag's handle types are stored in the single products.handle_type text
// column as a comma-separated list ("Handbag,Shoulder Bag"), so a product
// that predates multi-select (one plain value) reads back unchanged.
export function parseHandles(stored: string | null | undefined): ShopHandle[] {
  if (!stored) return [];
  return stored
    .split(",")
    // "Backpack" was this option's name before it became "Rucksack"; read it as
    // the same option so nothing saved under the old name is lost.
    .map((value) => (value.trim() === "Backpack" ? "Rucksack" : value.trim()))
    .filter((value): value is ShopHandle => (shopHandles as string[]).includes(value));
}

export function serializeHandles(handles: readonly ShopHandle[]): string | null {
  // Canonical (display) order, so the same selection always stores the same string.
  const ordered = shopHandles.filter((handle) => handles.includes(handle));
  return ordered.length ? ordered.join(",") : null;
}
