import type {BodyShapeType} from "@/lib/body-shapes";

export type AdminBodyShape = {
  id: string;
  name: string;
  shapeType: BodyShapeType;
  widthCm: number | null;
  widthBottomCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  diameterCm: number | null;
  thicknessCm: number | null;
  inStock: boolean;
  notes: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BodyShapeFormState = {
  name: string;
  shapeType: BodyShapeType;
  widthCm: string;
  widthBottomCm: string;
  heightCm: string;
  depthCm: string;
  diameterCm: string;
  thicknessCm: string;
  inStock: boolean;
  notes: string;
};

export function emptyBodyShapeForm(): BodyShapeFormState {
  return {
    name: "",
    shapeType: "box",
    widthCm: "",
    widthBottomCm: "",
    heightCm: "",
    depthCm: "",
    diameterCm: "",
    thicknessCm: "",
    inStock: true,
    notes: ""
  };
}

export function formFromBodyShape(shape: AdminBodyShape): BodyShapeFormState {
  return {
    name: shape.name,
    shapeType: shape.shapeType,
    widthCm: shape.widthCm !== null ? String(shape.widthCm) : "",
    widthBottomCm: shape.widthBottomCm !== null ? String(shape.widthBottomCm) : "",
    heightCm: shape.heightCm !== null ? String(shape.heightCm) : "",
    depthCm: shape.depthCm !== null ? String(shape.depthCm) : "",
    diameterCm: shape.diameterCm !== null ? String(shape.diameterCm) : "",
    thicknessCm: shape.thicknessCm !== null ? String(shape.thicknessCm) : "",
    inStock: shape.inStock,
    notes: shape.notes ?? ""
  };
}

export function buildBodyShapeFormData(form: BodyShapeFormState) {
  const formData = new FormData();
  formData.set("name", form.name.trim());
  formData.set("shapeType", form.shapeType);
  formData.set("widthCm", form.widthCm.trim());
  formData.set("widthBottomCm", form.widthBottomCm.trim());
  formData.set("heightCm", form.heightCm.trim());
  formData.set("depthCm", form.depthCm.trim());
  formData.set("diameterCm", form.diameterCm.trim());
  formData.set("thicknessCm", form.thicknessCm.trim());
  formData.set("inStock", String(form.inStock));
  formData.set("notes", form.notes.trim());
  return formData;
}
