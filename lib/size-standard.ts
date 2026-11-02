// The NATLOVERS customer-facing bag size standard.
//
// A bag's Small / Medium / Large is calculated from the physical dimensions of
// its assigned body (or from the admin's Dimensions Override, when one is
// set)  -  never from the body's name. "Cowak L" or "Oval gajih S" are just
// names; only the measurements decide the size.
//
// Calibrated against the full body catalogue (see the classification report in
// the project notes): volume has two clear natural gaps, 7,500 -> 8,448 cm³ and
// 13,650 -> 17,085 cm³, which become the Small/Medium and Medium/Large
// boundaries. Volume alone undersells a long, flat bag, so the longest side is
// a guard: a Medium bag with a side of 40 cm or more reads as Large.

export type StandardSize = "Small" | "Medium" | "Large";

export const SIZE_STANDARD = {
  // Below this volume (cm³) a bag is Small.
  smallBelowVolume: 8000,
  // At or above this volume (cm³) a bag is Large.
  largeFromVolume: 16000,
  // A Medium bag whose longest side (cm) reaches this is promoted to Large.
  largeFromLongestSide: 40
} as const;

export type SizeDimensions =
  | {kind: "box"; widthCm: number; widthBottomCm: number | null; heightCm: number; depthCm: number}
  | {kind: "round"; diameterCm: number; thicknessCm: number};

export type SizeClassification = {
  size: StandardSize;
  volumeCm3: number;
  longestSideCm: number;
  // True when the longest-side guard, not volume alone, decided the size.
  promotedByLongestSide: boolean;
};

const isPositive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;

// The raw columns of a body shape (see lib/body-shapes.ts), reduced to the
// measurements the standard needs. Null when anything required is missing or
// invalid  -  callers show "Size unavailable", they never default to Small.
export function dimensionsFromBody(body: {
  shapeType: string;
  widthCm: number | null;
  widthBottomCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  diameterCm: number | null;
  thicknessCm: number | null;
}): SizeDimensions | null {
  if (body.shapeType === "round") {
    // A round body is a disc: its face (diameter) and how thick it is.
    if (isPositive(body.diameterCm) && isPositive(body.thicknessCm)) {
      return {kind: "round", diameterCm: body.diameterCm, thicknessCm: body.thicknessCm};
    }
    return null;
  }
  if (isPositive(body.widthCm) && isPositive(body.heightCm) && isPositive(body.depthCm)) {
    return {
      kind: "box",
      widthCm: body.widthCm,
      widthBottomCm: isPositive(body.widthBottomCm) ? body.widthBottomCm : null,
      heightCm: body.heightCm,
      depthCm: body.depthCm
    };
  }
  return null;
}

// Free-text override such as "Approx. 30 x 20 x 15 cm" or "Ø24 x 10 cm". Three
// numbers read as width x height x depth; a leading diameter sign (Ø) with two
// numbers reads as diameter x thickness. Anything else is not understood.
export function dimensionsFromText(text: string): SizeDimensions | null {
  const cleaned = text.replace(/,/g, ".");
  const numbers = (cleaned.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  const isRound = /[øØ⌀]|\bdia(?:m|meter)?\b/i.test(cleaned);
  if (isRound && numbers.length === 2 && numbers.every(isPositive)) {
    return {kind: "round", diameterCm: numbers[0], thicknessCm: numbers[1]};
  }
  if (!isRound && numbers.length === 3 && numbers.every(isPositive)) {
    return {kind: "box", widthCm: numbers[0], widthBottomCm: null, heightCm: numbers[1], depthCm: numbers[2]};
  }
  return null;
}

export function sizeVolume(dimensions: SizeDimensions): number {
  if (dimensions.kind === "round") {
    return Math.PI * (dimensions.diameterCm / 2) ** 2 * dimensions.thicknessCm;
  }
  // A body that narrows toward the base is averaged between top and bottom.
  const width = dimensions.widthBottomCm != null ? (dimensions.widthCm + dimensions.widthBottomCm) / 2 : dimensions.widthCm;
  return width * dimensions.heightCm * dimensions.depthCm;
}

export function longestSide(dimensions: SizeDimensions): number {
  return dimensions.kind === "round"
    ? Math.max(dimensions.diameterCm, dimensions.thicknessCm)
    : Math.max(dimensions.widthCm, dimensions.widthBottomCm ?? 0, dimensions.heightCm, dimensions.depthCm);
}

export function classifySize(dimensions: SizeDimensions): SizeClassification {
  const volumeCm3 = Math.round(sizeVolume(dimensions));
  const longestSideCm = longestSide(dimensions);
  let size: StandardSize = "Medium";
  if (volumeCm3 < SIZE_STANDARD.smallBelowVolume) size = "Small";
  else if (volumeCm3 >= SIZE_STANDARD.largeFromVolume) size = "Large";
  const promotedByLongestSide = size === "Medium" && longestSideCm >= SIZE_STANDARD.largeFromLongestSide;
  if (promotedByLongestSide) size = "Large";
  return {size, volumeCm3, longestSideCm, promotedByLongestSide};
}

export type ResolvedBagSize = {
  // The size that applies: the manual override when one is set, otherwise the
  // calculated one. Null when neither exists ("Size unavailable").
  size: StandardSize | null;
  source: "calculated" | "manual" | "unavailable";
  // Always kept, even when overridden, so the original calculation stays visible.
  calculated: SizeClassification | null;
  // Where the numbers came from.
  basis: "override" | "body" | "none";
  dimensions: SizeDimensions | null;
};

export function resolveBagSize(input: {
  body: Parameters<typeof dimensionsFromBody>[0] | null;
  dimensionsOverride: string;
  manualSize: StandardSize | null;
}): ResolvedBagSize {
  const overrideText = input.dimensionsOverride.trim();
  // An active Dimensions Override replaces the body's own dimensions entirely.
  const basis: ResolvedBagSize["basis"] = overrideText ? "override" : input.body ? "body" : "none";
  const dimensions =
    basis === "override" ? dimensionsFromText(overrideText) : basis === "body" && input.body ? dimensionsFromBody(input.body) : null;
  const calculated = dimensions ? classifySize(dimensions) : null;

  if (input.manualSize) return {size: input.manualSize, source: "manual", calculated, basis, dimensions};
  if (calculated) return {size: calculated.size, source: "calculated", calculated, basis, dimensions};
  return {size: null, source: "unavailable", calculated: null, basis, dimensions};
}

export function describeDimensions(dimensions: SizeDimensions): string {
  if (dimensions.kind === "round") return `Ø${dimensions.diameterCm} × ${dimensions.thicknessCm} cm`;
  const width = dimensions.widthBottomCm != null ? `${dimensions.widthCm}/${dimensions.widthBottomCm}` : `${dimensions.widthCm}`;
  return `${width} × ${dimensions.heightCm} × ${dimensions.depthCm} cm`;
}
