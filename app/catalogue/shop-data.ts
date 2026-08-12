import {Locale} from "@/lib/site";

export type ShopMaterial = "Agel" | "Water Hyacinth" | "Gajih" | "Woven Fabric" | "Patchwork";

export type ShopSize = "Small" | "Medium" | "Large";

export type ShopShape = "Rectangle" | "Round" | "House Shaped";

export type ShopHandle = "Handbag" | "Shoulder Bag" | "Sling Bag" | "Clutch";

export type ShopProductType = "Bags" | "Dolls" | "Accessories" | "Apparels";

export type ShopProduct = {
  slug: string;
  name: string;
  priceIdr: number;
  imageUrl: string;
  productType: ShopProductType;
  materials: ShopMaterial[];
  size: ShopSize;
  shape: ShopShape;
  handle: ShopHandle;
  soldOut?: boolean;
};

type BilingualLabel = {en: string; id: string};

// Fixed catalogue order per material/size/shape/handle group. Size, Shape,
// and Handle keep this exact order everywhere (it's not alphabetical).
// Material is the one group that's re-sorted alphabetically by whichever
// language is currently displayed — see getSortedMaterials below.
export const shopMaterials: ShopMaterial[] = ["Agel", "Water Hyacinth", "Gajih", "Woven Fabric", "Patchwork"];
export const shopSizes: ShopSize[] = ["Small", "Medium", "Large"];
export const shopShapes: ShopShape[] = ["Rectangle", "Round", "House Shaped"];
export const shopHandles: ShopHandle[] = ["Handbag", "Shoulder Bag", "Sling Bag", "Clutch"];

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

export function getSortedMaterials(locale: Locale): ShopMaterial[] {
  return [...shopMaterials].sort((a, b) => materialLabels[a][locale].localeCompare(materialLabels[b][locale]));
}

export const shopProductTypes: ShopProductType[] = ["Bags", "Dolls", "Accessories", "Apparels"];

export const productTypeLabels: Record<ShopProductType, BilingualLabel> = {
  Bags: {en: "Bags", id: "Tas"},
  Dolls: {en: "Dolls", id: "Boneka"},
  Accessories: {en: "Accessories", id: "Aksesoris"},
  Apparels: {en: "Apparels", id: "Pakaian"}
};

type TagStyle = {bg: string; border: string; text: string};

export const sizePillStyle: TagStyle = {bg: "#DCE6EA", border: "#B8CDD4", text: "#2A3D42"};
export const handlePillStyle: TagStyle = {bg: "#F3E2D6", border: "#DEBBA3", text: "#5A3A22"};

export const materialImageStyle: Record<ShopMaterial, {bg: string; border: string}> = {
  Agel: {bg: "#EFE3CE", border: "#D3BFA0"},
  "Water Hyacinth": {bg: "#E1EADD", border: "#B9CBB4"},
  Gajih: {bg: "#F3E2D6", border: "#DEBBA3"},
  "Woven Fabric": {bg: "#E7DEEC", border: "#C9B9DA"},
  Patchwork: {bg: "#F0DEE0", border: "#DEBBBF"}
};
