import {Locale} from "@/lib/site";

export type ShopMaterial = "Agel" | "Water Hyacinth" | "Gajih" | "Woven Fabric" | "Patchwork";

// A coarse, admin-assigned browsing tag for Bags/Dolls  -  independent of a
// product's real dimensions, which live on its assigned body (see
// lib/body-shapes.ts and products.bodyShapeId in lib/db/schema.ts). Also
// reused as-is by Custom Studio's own commission-intake sizing (see
// lib/custom-studio.ts), an unrelated system that happens to share the same
// three-value vocabulary.
export type ShopSize = "Small" | "Medium" | "Large";

export type ShopShape = "Rectangle" | "Round" | "House Shaped";

export type ShopHandle = "Handbag" | "Shoulder Bag" | "Sling Bag" | "Clutch";

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
  imageUrl: string;
  productType: ShopProductType;
  size: ShopSize | null;
  shape: ShopShape | null;
  handle: ShopHandle | null;
  materials: ShopMaterial[];
  accessoryCategory: AccessoryCategory | null;
  soldOut?: boolean;
};

type BilingualLabel = {en: string; id: string};

// Fixed, literal display order per group  -  Size stays in its given logical
// order, everything else listed here is already alphabetical (by English
// label) and stays fixed regardless of locale.
export const bagMaterials: ShopMaterial[] = ["Agel", "Gajih", "Patchwork", "Water Hyacinth", "Woven Fabric"];
export const shopSizes: ShopSize[] = ["Small", "Medium", "Large"];
export const shopShapes: ShopShape[] = ["House Shaped", "Rectangle", "Round"];
export const shopHandles: ShopHandle[] = ["Clutch", "Handbag", "Shoulder Bag", "Sling Bag"];
export const accessoryCategories: AccessoryCategory[] = ["Bracelet", "Charm", "Necklace"];

export const materialLabels: Record<ShopMaterial, BilingualLabel> = {
  Agel: {en: "Agel", id: "Agel"},
  "Water Hyacinth": {en: "Water Hyacinth", id: "Enceng Gondok"},
  Gajih: {en: "Gajih", id: "Gajih"},
  "Woven Fabric": {en: "Woven Fabric", id: "Kain Tenun"},
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
  "House Shaped": {en: "House Shaped", id: "Bentuk Rumah"}
};

export const handleLabels: Record<ShopHandle, BilingualLabel> = {
  Handbag: {en: "Handbag", id: "Jinjing"},
  "Shoulder Bag": {en: "Shoulder Bag", id: "Bahu"},
  "Sling Bag": {en: "Sling Bag", id: "Slempang"},
  Clutch: {en: "Clutch", id: "Clutch"}
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
  "Water Hyacinth": {bg: "#E1EADD", border: "#B9CBB4"},
  Gajih: {bg: "#F3E2D6", border: "#DEBBA3"},
  "Woven Fabric": {bg: "#E7DEEC", border: "#C9B9DA"},
  Patchwork: {bg: "#F0DEE0", border: "#DEBBBF"}
};

export const DEFAULT_IMAGE_STYLE = {bg: "#eee7d8", border: "#d9cfc0"};
