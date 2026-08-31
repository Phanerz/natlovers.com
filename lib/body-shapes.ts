export type BodyShapeType = "box" | "round";

export type BodyShapeDimensionsLike = {
  shapeType: BodyShapeType;
  widthCm: number | null;
  widthBottomCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  diameterCm: number | null;
  thicknessCm: number | null;
};

// The one place every read site (admin summary, storefront Dimensions
// accordion) turns a body's raw columns into display text, so they can
// never disagree. Returns null when the shape doesn't have enough real
// measurements yet (e.g. "Palit lodong/bucket," in the catalog with no
// dimensions recorded)  -  callers treat that the same as "no dimensions to
// show," not an error.
export function formatBodyShapeDimensions(shape: BodyShapeDimensionsLike): string | null {
  if (shape.shapeType === "round") {
    if (shape.diameterCm == null) {
      return null;
    }
    const parts = [`Diameter: ${shape.diameterCm} cm`];
    if (shape.heightCm != null) {
      parts.push(`Height: ${shape.heightCm} cm`);
    }
    if (shape.thicknessCm != null) {
      parts.push(`Thickness: ${shape.thicknessCm} cm`);
    }
    return parts.join(", ");
  }

  if (shape.widthCm == null || shape.heightCm == null || shape.depthCm == null) {
    return null;
  }
  const width = shape.widthBottomCm != null ? `${shape.widthCm}/${shape.widthBottomCm} cm` : `${shape.widthCm} cm`;
  return `Width: ${width}, Height: ${shape.heightCm} cm, Depth: ${shape.depthCm} cm`;
}

// Short label used in dropdown options and list rows, e.g. "40/27 x 30 x 17
// cm" or "Ø24 x 26 cm (t13)". Falls back to a plain dash when nothing is
// recorded yet.
export function summarizeBodyShapeDimensions(shape: BodyShapeDimensionsLike): string {
  if (shape.shapeType === "round") {
    if (shape.diameterCm == null) {
      return "—";
    }
    const height = shape.heightCm != null ? ` x ${shape.heightCm}` : "";
    const thickness = shape.thicknessCm != null ? ` (t${shape.thicknessCm})` : "";
    return `Ø${shape.diameterCm}${height} cm${thickness}`;
  }

  if (shape.widthCm == null || shape.heightCm == null || shape.depthCm == null) {
    return "—";
  }
  const width = shape.widthBottomCm != null ? `${shape.widthCm}/${shape.widthBottomCm}` : `${shape.widthCm}`;
  return `${width} x ${shape.heightCm} x ${shape.depthCm} cm`;
}
