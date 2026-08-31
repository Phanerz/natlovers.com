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
import type {AdminBodyShape} from "./body-shape-types";

export type ColourOption = {label: string; hex: string};

export type ProductStatus = "active" | "draft" | "archived";
export type ProductVisibility = "public" | "private" | "hidden";
export type BackorderPolicy = "deny" | "allow";

// Quick-start palette offered in the admin colour editor and used to seed
// new products  -  colour sections show by default (the admin toggle exists
// to turn a section off for a product that genuinely has no colour choice,
// not to opt in), and an empty "no colours added yet" section the moment
// it's turned on would look broken, so it starts populated with these three
// real brand colours instead.
export const TEMPLATE_COLOUR_OPTIONS: ColourOption[] = [
  {label: "Natlovers Green", hex: "#344332"},
  {label: "Black", hex: "#000000"},
  {label: "White", hex: "#FFFFFF"}
];

export type AdminProduct = {
  slug: string;
  name: string;
  priceIdr: number;
  compareAtPriceIdr: number | null;
  costPriceIdr: number | null;
  imageUrl: string;
  images: string[];
  imageZoomEnabled: boolean;
  description: string | null;
  shortDescription: string | null;
  productType: ShopProductType;
  subcategory: string | null;
  materials: ShopMaterial[];
  size: ShopSize | null;
  shape: ShopShape | null;
  handle: ShopHandle | null;
  accessoryCategory: AccessoryCategory | null;
  tags: string[];
  collections: string[];
  soldOut?: boolean;
  isActive: boolean;
  status: ProductStatus;
  visibility: ProductVisibility;
  publishedAt: string | null;
  stock: number | null;
  lowStockThreshold: number | null;
  allowBackorders: BackorderPolicy;
  productCode: string | null;
  vendor: string | null;
  dimensions: string | null;
  bodyShapeId: string | null;
  bodyShape: AdminBodyShape | null;
  metaTitle: string | null;
  metaDescription: string | null;
  hasBaseColour: boolean;
  baseColourOptions: ColourOption[];
  hasHandleColour: boolean;
  handleColourOptions: ColourOption[];
  hasPersonalisation: boolean;
  personalisationOptions: string[];
  createdAt: string;
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
  compareAtPriceIdr: string;
  costPriceIdr: string;
  description: string;
  shortDescription: string;
  productType: ShopProductType;
  subcategory: string;
  // Empty string means "unassigned"  -  the grandfathered state every
  // product migrated from the old Small/Medium/Large size system starts in
  // (see attributesForType in lib/admin-products.ts). A new product must
  // pick a real one from the Body Shapes catalog before it can be created.
  bodyShapeId: string;
  // A coarse Small/Medium/Large browsing tag, independent of bodyShapeId
  // above  -  see the comment on products.size in lib/db/schema.ts.
  size: ShopSize;
  shape: ShopShape;
  handle: ShopHandle;
  accessoryCategory: AccessoryCategory;
  materials: ShopMaterial[];
  tags: string;
  collections: string[];
  // Already-uploaded URLs, in the admin's chosen display order (index 0 is
  // the main image)  -  see components/admin/image-dropzone.tsx.
  images: string[];
  imageZoomEnabled: boolean;
  // Empty string means "not tracked"  -  kept as strings (not number | null)
  // since these are plain controlled inputs; buildFormData below is what
  // decides what null/empty actually means when it builds the request.
  stock: string;
  lowStockThreshold: string;
  allowBackorders: BackorderPolicy;
  // Just the part after the fixed "NAT-" prefix  -  the prefix itself is
  // rendered read-only in the form and re-joined in buildFormData.
  productCodeSuffix: string;
  vendor: string;
  // Free text, e.g. "Approx. 30 x 20 x 15 cm" or an override for an
  // irregular piece the assigned body's own L/W/H can't express. Empty
  // means "use the assigned body's real dimensions"  -  kept as a plain
  // string like stock/productCodeSuffix above.
  dimensions: string;
  status: ProductStatus;
  visibility: ProductVisibility;
  // datetime-local input value ("" means "not published yet").
  publishedAt: string;
  metaTitle: string;
  metaDescription: string;
  hasBaseColour: boolean;
  baseColourOptions: ColourOption[];
  hasHandleColour: boolean;
  handleColourOptions: ColourOption[];
  hasPersonalisation: boolean;
  personalisationOptions: string[];
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  // datetime-local wants "YYYY-MM-DDTHH:mm" in local time, no seconds/Z.
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function emptyForm(): ProductFormState {
  return {
    name: "",
    priceIdr: "",
    compareAtPriceIdr: "",
    costPriceIdr: "",
    description: "",
    shortDescription: "",
    productType: shopProductTypes[0],
    subcategory: "",
    bodyShapeId: "",
    size: shopSizes[0],
    shape: shopShapes[0],
    handle: shopHandles[0],
    accessoryCategory: accessoryCategories[0],
    materials: [],
    tags: "",
    collections: [],
    images: [],
    imageZoomEnabled: true,
    stock: "",
    lowStockThreshold: "",
    allowBackorders: "deny",
    productCodeSuffix: "",
    vendor: "",
    dimensions: "",
    status: "active",
    visibility: "public",
    publishedAt: "",
    metaTitle: "",
    metaDescription: "",
    hasBaseColour: true,
    baseColourOptions: TEMPLATE_COLOUR_OPTIONS.map((option) => ({...option})),
    hasHandleColour: true,
    handleColourOptions: TEMPLATE_COLOUR_OPTIONS.map((option) => ({...option})),
    hasPersonalisation: false,
    personalisationOptions: []
  };
}

export function formFromProduct(product: AdminProduct): ProductFormState {
  return {
    name: product.name,
    priceIdr: String(product.priceIdr),
    compareAtPriceIdr: product.compareAtPriceIdr !== null ? String(product.compareAtPriceIdr) : "",
    costPriceIdr: product.costPriceIdr !== null ? String(product.costPriceIdr) : "",
    description: product.description ?? "",
    shortDescription: product.shortDescription ?? "",
    productType: product.productType,
    subcategory: product.subcategory ?? "",
    bodyShapeId: product.bodyShapeId ?? "",
    size: product.size ?? shopSizes[0],
    shape: product.shape ?? shopShapes[0],
    handle: product.handle ?? shopHandles[0],
    accessoryCategory: product.accessoryCategory ?? accessoryCategories[0],
    materials: product.materials,
    tags: product.tags.join(", "),
    collections: product.collections,
    images: product.images,
    imageZoomEnabled: product.imageZoomEnabled,
    stock: product.stock !== null ? String(product.stock) : "",
    lowStockThreshold: product.lowStockThreshold !== null ? String(product.lowStockThreshold) : "",
    allowBackorders: product.allowBackorders,
    productCodeSuffix: product.productCode ? product.productCode.slice(PRODUCT_CODE_PREFIX.length) : "",
    vendor: product.vendor ?? "",
    dimensions: product.dimensions ?? "",
    status: product.status,
    visibility: product.visibility,
    publishedAt: toDatetimeLocal(product.publishedAt),
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    hasBaseColour: product.hasBaseColour,
    baseColourOptions: product.baseColourOptions,
    hasHandleColour: product.hasHandleColour,
    handleColourOptions: product.handleColourOptions,
    hasPersonalisation: product.hasPersonalisation,
    personalisationOptions: product.personalisationOptions
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
  formData.set("compareAtPriceIdr", form.compareAtPriceIdr.trim());
  formData.set("costPriceIdr", form.costPriceIdr.trim());
  formData.set("description", form.description);
  formData.set("shortDescription", form.shortDescription.trim());
  formData.set("productType", form.productType);
  formData.set("subcategory", form.subcategory.trim());

  if (form.productType === "Bags") {
    if (form.bodyShapeId) formData.set("bodyShapeId", form.bodyShapeId);
    formData.set("size", form.size);
    formData.set("shape", form.shape);
    formData.set("handle", form.handle);
    form.materials.forEach((material) => formData.append("materials", material));
  } else if (form.productType === "Dolls") {
    if (form.bodyShapeId) formData.set("bodyShapeId", form.bodyShapeId);
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
  form.collections.forEach((collection) => formData.append("collections", collection));
  form.images.forEach((url) => formData.append("images", url));
  formData.set("imageZoomEnabled", String(form.imageZoomEnabled));

  formData.set("stock", form.stock.trim());
  formData.set("lowStockThreshold", form.lowStockThreshold.trim());
  formData.set("allowBackorders", form.allowBackorders);
  formData.set("productCode", form.productCodeSuffix.trim() ? `${PRODUCT_CODE_PREFIX}${form.productCodeSuffix.trim()}` : "");
  formData.set("vendor", form.vendor.trim());
  formData.set("dimensions", form.dimensions.trim());

  formData.set("status", form.status);
  formData.set("visibility", form.visibility);
  formData.set("publishedAt", form.publishedAt);
  formData.set("metaTitle", form.metaTitle.trim());
  formData.set("metaDescription", form.metaDescription.trim());

  formData.set("hasBaseColour", String(form.hasBaseColour));
  formData.set("baseColourOptions", JSON.stringify(form.baseColourOptions));
  formData.set("hasHandleColour", String(form.hasHandleColour));
  formData.set("handleColourOptions", JSON.stringify(form.handleColourOptions));
  formData.set("hasPersonalisation", String(form.hasPersonalisation));
  form.personalisationOptions.forEach((option) => formData.append("personalisationOptions", option));

  return formData;
}
