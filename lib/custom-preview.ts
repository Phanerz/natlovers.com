import type {CustomConfig, CustomProductType} from "@/lib/custom-studio";

// Live-preview matching. Pure and client-safe, so the centre column can
// re-match on every selection change without a network round trip.
//
// The studio does not composite anything. It finds the real catalogue
// product whose actual attributes come closest to what is being configured
// and shows that product's real photographs. Where the match is inexact,
// the UI says so  -  see PreviewMatch.quality, which the review step surfaces
// verbatim so nobody is led to believe they are looking at a rendering of
// their own piece.

export type PreviewProduct = {
  slug: string;
  name: string;
  images: string[];
  productType: string;
  shape: string | null;
  handleType: string | null;
  materials: string[];
  size: string | null;
};

export type PreviewCatalogue = Record<CustomProductType, PreviewProduct[]>;

export const emptyPreviewCatalogue: PreviewCatalogue = {Bags: [], Dolls: [], Apparels: []};

// How much of the configuration the shown photograph actually reflects.
// "none" means the catalogue holds no product of this type at all, which is
// the honest state for Dolls and Apparel until the workshop photographs
// some  -  the preview panel renders an explanatory placeholder rather than
// borrowing an unrelated product's picture.
export type PreviewMatchQuality = "exact" | "close" | "type-only" | "none";

export type PreviewMatch = {
  product: PreviewProduct | null;
  quality: PreviewMatchQuality;
  // Attributes of the configuration this photograph genuinely shares.
  matched: string[];
  // Attributes it does not, listed so the UI can say which parts of the
  // design the picture is not showing.
  unmatched: string[];
};

const noMatch: PreviewMatch = {product: null, quality: "none", matched: [], unmatched: []};

// Attributes the catalogue actually records, in the order they most affect
// what a bag looks like in a photograph. Colour comes from the materials
// array (natural fibre is undyed, so the fibre is the colour); shape,
// handle, and size come from their own columns. Size here is the product's
// coarse Small/Medium/Large browsing tag (see the comment on products.size
// in lib/db/schema.ts), which happens to share Custom Studio's own sizing
// vocabulary  -  not the real measurements on the product's assigned body
// (see lib/body-shapes.ts), which has no equivalent in Custom Studio.
function scoreBag(product: PreviewProduct, config: Extract<CustomConfig, {productType: "Bags"}>) {
  const matched: string[] = [];
  const unmatched: string[] = [];

  if (product.shape === config.shape) matched.push("shape");
  else unmatched.push("shape");

  if (config.handle) {
    if (product.handleType === config.handle) matched.push("handle");
    else unmatched.push("handle");
  }

  if (product.materials.includes(config.colour)) matched.push("base colour");
  else unmatched.push("base colour");

  if (product.size === config.size) matched.push("size");
  else unmatched.push("size");

  // Shape and handle dominate the silhouette, so they are weighted above
  // colour and size  -  a photograph of the right silhouette in the wrong
  // fibre is a far more useful reference than the reverse.
  const score =
    (product.shape === config.shape ? 8 : 0) +
    (config.handle && product.handleType === config.handle ? 6 : 0) +
    (product.materials.includes(config.colour) ? 3 : 0) +
    (product.size === config.size ? 1 : 0);

  return {score, matched, unmatched};
}

function scoreGeneric(product: PreviewProduct, config: CustomConfig) {
  const matched: string[] = [];
  const unmatched: string[] = [];

  const wantedSize = "size" in config ? String(config.size) : null;
  if (wantedSize && product.size === wantedSize) matched.push("size");
  else if (wantedSize) unmatched.push("size");

  const wantedColour = "colour" in config ? String(config.colour) : null;
  if (wantedColour && product.materials.includes(wantedColour)) matched.push("base colour");
  else if (wantedColour) unmatched.push("base colour");

  const score = (matched.includes("size") ? 2 : 0) + (matched.includes("base colour") ? 3 : 0);

  return {score, matched, unmatched};
}

export function findPreviewMatch(config: CustomConfig, catalogue: PreviewCatalogue): PreviewMatch {
  const candidates = (catalogue[config.productType] ?? []).filter((product) => product.images.length > 0);

  if (!candidates.length) {
    return noMatch;
  }

  let best: {product: PreviewProduct; score: number; matched: string[]; unmatched: string[]} | null = null;

  for (const product of candidates) {
    const {score, matched, unmatched} =
      config.productType === "Bags" ? scoreBag(product, config) : scoreGeneric(product, config);

    if (!best || score > best.score) {
      best = {product, score, matched, unmatched};
    }
  }

  if (!best) {
    return noMatch;
  }

  const quality: PreviewMatchQuality =
    best.unmatched.length === 0 ? "exact" : best.matched.length > 0 ? "close" : "type-only";

  return {product: best.product, quality, matched: best.matched, unmatched: best.unmatched};
}

// One sentence describing how faithful the current photograph is, shown
// under the preview and repeated in the review panel. Every branch is
// derived from the match itself, so it can never overstate what is on
// screen.
export function describePreviewMatch(match: PreviewMatch, noun: string): string {
  if (match.quality === "none") {
    return `We don't have reference photography for custom ${noun} work yet. The studio will send visual references once they've reviewed your request.`;
  }
  if (match.quality === "exact") {
    return `Shown: ${match.product?.name} from our catalogue, which matches every part of your configuration. Your piece is made to order, so it will vary in the way handmade work does.`;
  }
  if (match.quality === "close") {
    return `Closest real piece we've made: ${match.product?.name}. It matches your ${formatList(match.matched)} but not your ${formatList(match.unmatched)}. Final appearance is confirmed by the studio.`;
  }
  return `Shown: ${match.product?.name}, as a general reference for our work. It doesn't reflect your specific selections  -  the studio confirms the final design with you.`;
}

function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

