import type {ShopSize} from "@/app/catalogue/shop-data";

export type SizeDimensions = {L: number; W: number; H: number};

// Placeholder figures, not real measurements yet - every product currently
// shows the same numbers regardless of its actual size. Kept as one
// exported constant, keyed by the real ShopSize enum, so replacing them
// with real per-size (or eventually per-product) measurements later is a
// one-place edit, not a hunt through the customiser's markup.
export const SIZE_DIMENSIONS_CM: Record<ShopSize, SizeDimensions> = {
  Small: {L: 1, W: 1, H: 1},
  Medium: {L: 2, W: 2, H: 2},
  Large: {L: 3, W: 3, H: 3}
};

export function formatSizeDimensions(size: ShopSize): string {
  const {L, W, H} = SIZE_DIMENSIONS_CM[size];
  return `L: ${L} cm, W: ${W} cm, H: ${H} cm`;
}
