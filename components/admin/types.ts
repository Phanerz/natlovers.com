import {
  AccessoryCategory,
  ShopHandle,
  ShopMaterial,
  ShopProductType,
  ShopShape,
  ShopSize,
  accessoryCategories,
  shopHandles,
  shopProductTypes,
  shopShapes,
  shopSizes
} from "@/app/catalogue/shop-data";

export type ColourOption = {label: string; hex: string};

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
  accessoryCategory: AccessoryCategory | null;
  tags: string[];
  soldOut?: boolean;
  isActive: boolean;
  stock: number | null;
  productCode: string | null;
  dimensions: string | null;
  hasBaseColour: boolean;
  baseColourOptions: ColourOption[];
  hasHandleColour: boolean;
  handleColourOptions: ColourOption[];
  updatedAt: string;
};

export const PRODUCT_CODE_PREFIX = "NAT-";

// Every per-type field is kept populated with a sensible default at all
// times (not left undefined) so switching Product Type in the form never
// hits an unset value  -  buildFormData below is what actually decides which
// of these get sent, based on the selected productType.
export type ProductFormState = {
  name: string;
  priceIdr: string;
  description: string;
  productType: ShopProductType;
  size: ShopSize;
  shape: ShopShape;
  handle: ShopHandle;
  accessoryCategory: AccessoryCategory;
  materials: ShopMaterial[];
  tags: string;
  // Already-uploaded URLs, in the admin's chosen display order (index 0 is
  // the main image)  -  see components/admin/image-dropzone.tsx.
  images: string[];
  // Empty string means "not tracked"  -  kept as strings (not number | null)
  // since these are plain controlled inputs; buildFormData below is what
  // decides what null/empty actually means when it builds the request.
  stock: string;
  // Just the part after the fixed "NAT-" prefix  -  the prefix itself is
  // rendered read-only in the form and re-joined in buildFormData.
  productCodeSuffix: string;
  // Free text, e.g. "Approx. 30 x 20 x 15 cm". Empty means "not measured
  // yet"  -  kept as a plain string like stock/productCodeSuffix above.
  dimensions: string;
  hasBaseColour: boolean;
  baseColourOptions: ColourOption[];
  hasHandleColour: boolean;
  handleColourOptions: ColourOption[];
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
    accessoryCategory: accessoryCategories[0],
    materials: [],
    tags: "",
    images: [],
    stock: "",
    productCodeSuffix: "",
    dimensions: "",
    hasBaseColour: false,
    baseColourOptions: [],
    hasHandleColour: false,
    handleColourOptions: []
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
    accessoryCategory: product.accessoryCategory ?? accessoryCategories[0],
    materials: product.materials,
    tags: product.tags.join(", "),
    images: product.images,
    stock: product.stock !== null ? String(product.stock) : "",
    productCodeSuffix: product.productCode ? product.productCode.slice(PRODUCT_CODE_PREFIX.length) : "",
    dimensions: product.dimensions ?? "",
    hasBaseColour: product.hasBaseColour,
    baseColourOptions: product.baseColourOptions,
    hasHandleColour: product.hasHandleColour,
    handleColourOptions: product.handleColourOptions
  };
}

// Only sends the attribute fields that are relevant to the selected
// productType  -  a Doll's submission never carries shape/handle, an
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
  } else if (form.productType === "Accessories") {
    formData.set("accessoryCategory", form.accessoryCategory);
  }
  // Apparels: no per-type attributes.

  form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .forEach((tag) => formData.append("tags", tag));
  form.images.forEach((url) => formData.append("images", url));

  formData.set("stock", form.stock.trim());
  formData.set("productCode", form.productCodeSuffix.trim() ? `${PRODUCT_CODE_PREFIX}${form.productCodeSuffix.trim()}` : "");
  formData.set("dimensions", form.dimensions.trim());

  formData.set("hasBaseColour", String(form.hasBaseColour));
  formData.set("baseColourOptions", JSON.stringify(form.baseColourOptions));
  formData.set("hasHandleColour", String(form.hasHandleColour));
  formData.set("handleColourOptions", JSON.stringify(form.handleColourOptions));

  return formData;
}
