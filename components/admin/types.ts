import {EMPTY_PRODUCT_OPTIONS, type ProductOptions} from "@/lib/product-options";
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
import {SKU_REGISTRATION_PLACEHOLDER, buildSku, parseSku} from "@/lib/product-sku";
import {DEFAULT_COLOUR_OPTIONS, upgradeLegacyColours, type ColourOption} from "@/lib/colour-library";
import {resolveBagSize, type ResolvedBagSize} from "@/lib/size-standard";
import type {AdminBodyShape} from "./body-shape-types";

export type ProductStatus = "active" | "draft" | "archived";
export type BackorderPolicy = "deny" | "allow";

export type {ColourOption};

// New products start with the three core brand colours from the master
// library (lib/colour-library.ts)  -  colour sections show by default (the
// admin toggle exists to turn a section off for a product that genuinely has
// no colour choice, not to opt in), and an empty "no colours added yet"
// section the moment it's turned on would look broken.

export type AdminProduct = {
  slug: string;
  name: string;
  priceIdr: number;
  priceUsdCents: number | null;
  compareAtPriceIdr: number | null;
  costPriceIdr: number | null;
  imageUrl: string;
  images: string[];
  imageZoomEnabled: boolean;
  description: string | null;
  shortDescription: string | null;
  capGroupOverride?: "PIECES" | "ATELIER_EXTRAS" | null;
  maxPerOrder?: number | null;
  leadTimeWeeksMin?: number | null;
  leadTimeWeeksMax?: number | null;
  productType: ShopProductType;
  subcategory: string | null;
  materials: ShopMaterial[];
  size: ShopSize | null;
  shape: ShopShape | null;
  handle: ShopHandle | null;
  handles: ShopHandle[];
  accessoryCategory: AccessoryCategory | null;
  tags: string[];
  collections: string[];
  soldOut?: boolean;
  isActive: boolean;
  status: ProductStatus;
  publishedAt: string | null;
  stock: number | null;
  lowStockThreshold: number | null;
  allowBackorders: BackorderPolicy;
  productCode: string | null;
  sizeOverride: ShopSize | null;
  sizeOverrideReason: string | null;
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
  customisation?: ProductOptions | null;
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
  priceUsd: string;
  compareAtPriceIdr: string;
  costPriceIdr: string;
  description: string;
  shortDescription: string;
  capGroup: string;
  maxPerOrder: string;
  leadTimeWeeksMin: string;
  leadTimeWeeksMax: string;
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
  // Bags only: a manual size (with the reason) that replaces the calculated
  // one; null means "use the calculated size". See lib/size-standard.ts.
  sizeOverride: ShopSize | null;
  sizeOverrideReason: string;
  shape: ShopShape;
  // Multi-select; the first-listed handle is never special.
  handles: ShopHandle[];
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
  // The SKU is built from these (see lib/product-sku.ts): the category,
  // material, size and shape sections come from the fields above, so only
  // the manually-owned sections are stored here.
  skuDesign: string;
  skuVariant: string;
  skuRegistration: string;
  // True once the admin has typed their own design abbreviation, so a later
  // product-name change never overwrites it.
  skuDesignTouched: boolean;
  // A saved code that doesn't match what the attributes now generate (an
  // older free-text code, or one whose digits no longer agree with the
  // product). While set, it is kept exactly as saved instead of being
  // regenerated  -  the admin opts in to regenerating it.
  skuLegacyCode: string | null;
  vendor: string;
  // Free text, e.g. "Approx. 30 x 20 x 15 cm" or an override for an
  // irregular piece the assigned body's own L/W/H can't express. Empty
  // means "use the assigned body's real dimensions"  -  kept as a plain
  // string like stock/productCodeSuffix above.
  dimensions: string;
  status: ProductStatus;
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
  customisation: ProductOptions;
};

export const LEGACY_SIZE_REASON = "Assigned before the automatic size standard; not yet reviewed.";

// Bags are sized by the standard, not by hand. A saved bag whose size differs
// from what the standard now calculates (or can't be calculated at all) is
// carried forward as an explicit, visible manual size  -  never silently
// replaced  -  until the admin chooses to apply the calculated one.
function sizeStateFromProduct(product: AdminProduct) {
  const none = {sizeOverride: null, sizeOverrideReason: ""};
  if (product.productType !== "Bags") return none;
  if (product.sizeOverride) {
    return {sizeOverride: product.sizeOverride, sizeOverrideReason: product.sizeOverrideReason ?? ""};
  }
  const calculated = resolveBagSize({body: product.bodyShape, dimensionsOverride: product.dimensions ?? "", manualSize: null});
  if (product.size && calculated.size !== product.size) {
    return {sizeOverride: product.size, sizeOverrideReason: LEGACY_SIZE_REASON};
  }
  return none;
}

// Null for anything that isn't a bag (Dolls still pick a size by hand).
export function bagSizeForForm(form: ProductFormState, bodyShapes: AdminBodyShape[]): ResolvedBagSize | null {
  if (form.productType !== "Bags") return null;
  return resolveBagSize({
    body: bodyShapes.find((shape) => shape.id === form.bodyShapeId) ?? null,
    dimensionsOverride: form.dimensions,
    manualSize: form.sizeOverride
  });
}

export function skuPartsFromForm(form: ProductFormState, bodyShapes: AdminBodyShape[]) {
  const bag = bagSizeForForm(form, bodyShapes);
  return {
    productType: form.productType,
    design: form.skuDesign,
    variant: form.skuVariant,
    material: form.materials[0] ?? null,
    // Bags: the automatically classified size (null = unavailable). Dolls: the picked one.
    size: bag ? bag.size : form.productType === "Dolls" ? form.size : null,
    shape: form.shape,
    registration: form.skuRegistration
  };
}

// The code that will be saved: a preserved legacy code as-is, otherwise the
// generated one (null while incomplete).
export function skuForForm(form: ProductFormState, bodyShapes: AdminBodyShape[]): string | null {
  return form.skuLegacyCode ?? buildSku(skuPartsFromForm(form, bodyShapes));
}

// A product with no code yet starts in generated mode. A saved code is only
// re-generated automatically when doing so reproduces it exactly  -  anything
// else is kept untouched until the admin chooses to regenerate it.
function skuStateFromProduct(product: AdminProduct) {
  const base = {skuDesign: "", skuVariant: "1", skuRegistration: SKU_REGISTRATION_PLACEHOLDER, skuDesignTouched: true};
  if (!product.productCode) return {...base, skuDesignTouched: false, skuLegacyCode: null};
  const parsed = parseSku(product.productCode, product.productType);
  if (!parsed) return {...base, skuLegacyCode: product.productCode};
  const next = {...base, skuDesign: parsed.design, skuVariant: parsed.variant, skuRegistration: parsed.registration};
  const regenerated = buildSku({
    productType: product.productType,
    design: parsed.design,
    variant: parsed.variant,
    material: product.materials[0] ?? null,
    size: product.size,
    shape: product.shape,
    registration: parsed.registration
  });
  return {...next, skuLegacyCode: regenerated === product.productCode ? null : product.productCode};
}

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
    priceUsd: "",
    compareAtPriceIdr: "",
    costPriceIdr: "",
    description: "",
    shortDescription: "",
    capGroup: "",
    maxPerOrder: "",
    leadTimeWeeksMin: "",
    leadTimeWeeksMax: "",
    productType: shopProductTypes[0],
    subcategory: "",
    bodyShapeId: "",
    size: shopSizes[0],
    sizeOverride: null,
    sizeOverrideReason: "",
    shape: shopShapes[0],
    handles: ["Handbag"],
    accessoryCategory: accessoryCategories[0],
    materials: [],
    tags: "",
    collections: [],
    images: [],
    imageZoomEnabled: true,
    stock: "",
    lowStockThreshold: "",
    allowBackorders: "deny",
    skuDesign: "",
    skuVariant: "1",
    skuRegistration: SKU_REGISTRATION_PLACEHOLDER,
    skuDesignTouched: false,
    skuLegacyCode: null,
    vendor: "",
    dimensions: "",
    status: "active",
    publishedAt: "",
    metaTitle: "",
    metaDescription: "",
    hasBaseColour: true,
    baseColourOptions: DEFAULT_COLOUR_OPTIONS.map((option) => ({...option})),
    hasHandleColour: true,
    handleColourOptions: DEFAULT_COLOUR_OPTIONS.map((option) => ({...option})),
    hasPersonalisation: false,
    personalisationOptions: [],
    customisation: {...EMPTY_PRODUCT_OPTIONS}
  };
}

export function formFromProduct(product: AdminProduct): ProductFormState {
  const sku = skuStateFromProduct(product);
  return {
    name: product.name,
    priceIdr: String(product.priceIdr),
    priceUsd: product.priceUsdCents != null ? String(product.priceUsdCents / 100) : "",
    compareAtPriceIdr: product.compareAtPriceIdr !== null ? String(product.compareAtPriceIdr) : "",
    costPriceIdr: product.costPriceIdr !== null ? String(product.costPriceIdr) : "",
    description: product.description ?? "",
    shortDescription: product.shortDescription ?? "",
    capGroup: product.capGroupOverride ?? "",
    maxPerOrder: product.maxPerOrder != null ? String(product.maxPerOrder) : "",
    leadTimeWeeksMin: product.leadTimeWeeksMin != null ? String(product.leadTimeWeeksMin) : "",
    leadTimeWeeksMax: product.leadTimeWeeksMax != null ? String(product.leadTimeWeeksMax) : "",
    productType: product.productType,
    subcategory: product.subcategory ?? "",
    bodyShapeId: product.bodyShapeId ?? "",
    size: product.size ?? shopSizes[0],
    ...sizeStateFromProduct(product),
    shape: product.shape ?? shopShapes[0],
    handles: product.handles.length ? product.handles : product.handle ? [product.handle] : [],
    accessoryCategory: product.accessoryCategory ?? accessoryCategories[0],
    materials: product.materials,
    tags: product.tags.join(", "),
    collections: product.collections,
    images: product.images,
    imageZoomEnabled: product.imageZoomEnabled,
    stock: product.stock !== null ? String(product.stock) : "",
    lowStockThreshold: product.lowStockThreshold !== null ? String(product.lowStockThreshold) : "",
    allowBackorders: product.allowBackorders,
    ...sku,
    vendor: product.vendor ?? "",
    dimensions: product.dimensions ?? "",
    status: product.status,
    publishedAt: toDatetimeLocal(product.publishedAt),
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    hasBaseColour: product.hasBaseColour,
    // Old starter-set names (Black, White, Natlovers Green) are moved to their
    // library equivalents; hand-edited colours are left exactly as saved.
    baseColourOptions: upgradeLegacyColours(product.baseColourOptions),
    hasHandleColour: product.hasHandleColour,
    handleColourOptions: upgradeLegacyColours(product.handleColourOptions),
    hasPersonalisation: product.hasPersonalisation,
    personalisationOptions: product.personalisationOptions,
    // Products saved before felted animals existed have no `animals` entry yet.
    customisation: product.customisation
      ? {...product.customisation, animals: product.customisation.animals ?? EMPTY_PRODUCT_OPTIONS.animals}
      : {...EMPTY_PRODUCT_OPTIONS}
  };
}

// Only sends the attribute fields that are relevant to the selected
// productType  -  a Doll's submission never carries shape/handle, an
// Accessory's never carries size/materials, and so on. That's what lets
// lib/admin-products.ts's per-type validation work: it only ever sees the
// fields that type actually owns.
export function buildFormData(form: ProductFormState, bodyShapes: AdminBodyShape[]) {
  const formData = new FormData();
  formData.set("name", form.name);
  formData.set("priceIdr", form.priceIdr);
  formData.set("priceUsd", form.priceUsd.trim());
  formData.set("compareAtPriceIdr", form.compareAtPriceIdr.trim());
  formData.set("costPriceIdr", form.costPriceIdr.trim());
  formData.set("description", form.description);
  formData.set("shortDescription", form.shortDescription.trim());
  formData.set("capGroup", form.capGroup);
  formData.set("maxPerOrder", form.maxPerOrder.trim());
  formData.set("leadTimeWeeksMin", form.leadTimeWeeksMin.trim());
  formData.set("leadTimeWeeksMax", form.leadTimeWeeksMax.trim());
  formData.set("productType", form.productType);
  formData.set("subcategory", form.subcategory.trim());

  if (form.productType === "Bags") {
    if (form.bodyShapeId) formData.set("bodyShapeId", form.bodyShapeId);
    // No size is sent: the server calculates it from the body, and only reads a
    // manual size (with its reason) when one is set.
    formData.set("sizeOverride", form.sizeOverride ?? "");
    formData.set("sizeOverrideReason", form.sizeOverride ? form.sizeOverrideReason.trim() : "");
    formData.set("shape", form.shape);
    form.handles.forEach((handle) => formData.append("handle", handle));
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
  formData.set("productCode", skuForForm(form, bodyShapes) ?? "");
  formData.set("vendor", form.vendor.trim());
  formData.set("dimensions", form.dimensions.trim());

  formData.set("status", form.status);
  formData.set("publishedAt", form.publishedAt);
  formData.set("metaTitle", form.metaTitle.trim());
  formData.set("metaDescription", form.metaDescription.trim());

  formData.set("hasBaseColour", String(form.hasBaseColour));
  formData.set("baseColourOptions", JSON.stringify(form.baseColourOptions));
  formData.set("hasHandleColour", String(form.hasHandleColour));
  formData.set("handleColourOptions", JSON.stringify(form.handleColourOptions));
  formData.set("hasPersonalisation", String(form.hasPersonalisation));
  form.personalisationOptions.forEach((option) => formData.append("personalisationOptions", option));
  // Saved when there is anything to save: fields, or felted animals switched on.
  formData.set(
    "customisation",
    form.customisation.fields.length || form.customisation.animals.mode !== "none" ? JSON.stringify(form.customisation) : ""
  );

  return formData;
}
