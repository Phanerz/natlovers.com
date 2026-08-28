import type {ShopSize} from "@/app/catalogue/shop-data";

export type SizeDimensions = {L: number; W: number; H: number};

export type SizeDimensionOverrides = Partial<Record<ShopSize, SizeDimensions>>;

// Fallback figures, used for any size a product hasn't set real
// measurements for - see products.sizeDimensions in lib/db/schema.ts for
// the real per-product data these are a placeholder for.
export const SIZE_DIMENSIONS_CM: Record<ShopSize, SizeDimensions> = {
  Small: {L: 1, W: 1, H: 1},
  Medium: {L: 2, W: 2, H: 2},
  Large: {L: 3, W: 3, H: 3}
};

// A product's own measurement for `size`, if it has one, otherwise the
// shared placeholder  -  the one place every read site (admin summary,
// storefront customiser) resolves this, so they can never disagree.
export function resolveSizeDimensions(size: ShopSize, overrides?: SizeDimensionOverrides | null): SizeDimensions {
  return overrides?.[size] ?? SIZE_DIMENSIONS_CM[size];
}

export function formatSizeDimensions(size: ShopSize, overrides?: SizeDimensionOverrides | null): string {
  const {L, W, H} = resolveSizeDimensions(size, overrides);
  return `L: ${L} cm, W: ${W} cm, H: ${H} cm`;
}
