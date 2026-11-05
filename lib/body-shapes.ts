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

// Each measurement of a body with its plain name, in the order a person reads them, for the admin
// list: "Width 35 cm", "Height 26 cm", "Depth 15 cm". Empty when nothing is recorded yet.
export function bodyShapeMeasurements(shape: BodyShapeDimensionsLike): {label: string; value: string}[] {
  const list: {label: string; value: string}[] = [];
  if (shape.shapeType === "round") {
    if (shape.diameterCm != null) list.push({label: "Diameter", value: `${shape.diameterCm} cm`});
    if (shape.heightCm != null) list.push({label: "Height", value: `${shape.heightCm} cm`});
    if (shape.thicknessCm != null) list.push({label: "Thickness", value: `${shape.thicknessCm} cm`});
    return list;
  }
  if (shape.widthCm != null) {
    list.push(
      shape.widthBottomCm != null
        ? {label: "Width, top / bottom", value: `${shape.widthCm} / ${shape.widthBottomCm} cm`}
        : {label: "Width", value: `${shape.widthCm} cm`}
    );
  }
  if (shape.heightCm != null) list.push({label: "Height", value: `${shape.heightCm} cm`});
  if (shape.depthCm != null) list.push({label: "Depth", value: `${shape.depthCm} cm`});
  return list;
}

// Short label used in dropdown options and on the product page, with every number named:
// "W 35 x H 26 x D 15 cm" or "Diameter 24 x H 26 cm, 13 thick". A dash when nothing is recorded.
export function summarizeBodyShapeDimensions(shape: BodyShapeDimensionsLike): string {
  if (shape.shapeType === "round") {
    if (shape.diameterCm == null) {
      return "—";
    }
    const height = shape.heightCm != null ? ` x H ${shape.heightCm}` : "";
    const thickness = shape.thicknessCm != null ? `, ${shape.thicknessCm} thick` : "";
    return `Diameter ${shape.diameterCm}${height} cm${thickness}`;
  }

  if (shape.widthCm == null || shape.heightCm == null || shape.depthCm == null) {
    return "—";
  }
  const width = shape.widthBottomCm != null ? `${shape.widthCm}/${shape.widthBottomCm}` : `${shape.widthCm}`;
  return `W ${width} x H ${shape.heightCm} x D ${shape.depthCm} cm`;
}
