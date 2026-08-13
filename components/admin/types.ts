import {
  AccessoryCategory,
  ShopGender,
  ShopHandle,
  ShopMaterial,
  ShopProductType,
  ShopShape,
  ShopSize,
  accessoryCategories,
  shopGenders,
  shopHandles,
  shopProductTypes,
  shopShapes,
  shopSizes
} from "@/app/catalogue/shop-data";

export type AdminProduct = {
  slug: string;
  name: string;
  priceIdr: number;
  imageUrl: string;
  images: string[];
  description: string | null;
  productType: ShopProductType;
  materials: ShopMaterial[];
  size: ShopSize | null;
  shape: ShopShape | null;
  handle: ShopHandle | null;
  gender: ShopGender | null;
  accessoryCategory: AccessoryCategory | null;
  tags: string[];
  soldOut?: boolean;
  isActive: boolean;
  updatedAt: string;
};

// Every per-type field is kept populated with a sensible default at all
// times (not left undefined) so switching Product Type in the form never
// hits an unset value — buildFormData below is what actually decides which
// of these get sent, based on the selected productType.
export type ProductFormState = {
  name: string;
  priceIdr: string;
  description: string;
  productType: ShopProductType;
  size: ShopSize;
  shape: ShopShape;
  handle: ShopHandle;
  gender: ShopGender;
  accessoryCategory: AccessoryCategory;
  materials: ShopMaterial[];
  tags: string;
  images: File[];
};

export function emptyForm(): ProductFormState {
  return {
    name: "",
    priceIdr: "",
    description: "",
    productType: shopProductTypes[0],
    size: shopSizes[0],
    shape: shopShapes[0],
    handle: shopHandles[0],
    gender: shopGenders[0],
    accessoryCategory: accessoryCategories[0],
    materials: [],
    tags: "",
    images: []
  };
}

export function formFromProduct(product: AdminProduct): ProductFormState {
  return {
    name: product.name,
    priceIdr: String(product.priceIdr),
    description: product.description ?? "",
    productType: product.productType,
    size: product.size ?? shopSizes[0],
    shape: product.shape ?? shopShapes[0],
    handle: product.handle ?? shopHandles[0],
    gender: product.gender ?? shopGenders[0],
    accessoryCategory: product.accessoryCategory ?? accessoryCategories[0],
    materials: product.materials,
    tags: product.tags.join(", "),
    images: []
  };
}

// Only sends the attribute fields that are relevant to the selected
// productType — a Doll's submission never carries shape/handle, an
// Accessory's never carries size/materials, and so on. That's what lets
// lib/admin-products.ts's per-type validation work: it only ever sees the
// fields that type actually owns.
export function buildFormData(form: ProductFormState) {
  const formData = new FormData();
  formData.set("name", form.name);
  formData.set("priceIdr", form.priceIdr);
  formData.set("description", form.description);
  formData.set("productType", form.productType);

  if (form.productType === "Bags") {
    formData.set("size", form.size);
    formData.set("shape", form.shape);
    formData.set("handle", form.handle);
    form.materials.forEach((material) => formData.append("materials", material));
  } else if (form.productType === "Dolls") {
    formData.set("size", form.size);
    formData.set("gender", form.gender);
    form.materials.forEach((material) => formData.append("materials", material));
  } else if (form.productType === "Accessories") {
    formData.set("accessoryCategory", form.accessoryCategory);
  }
  // Apparels: no per-type attributes.

  form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .forEach((tag) => formData.append("tags", tag));
  form.images.forEach((file) => formData.append("images", file));
  return formData;
}
