import {and, desc, eq} from "drizzle-orm";
import {z} from "zod";
import {AdminBodyShape, assertBodyShapeExists, getBodyShapeById} from "@/lib/admin-body-shapes";
import {db, bodyShapes, products} from "@/lib/db";
import {sanitizeDescriptionHtml} from "@/lib/sanitize-html";
import {
  AccessoryCategory,
  ShopHandle,
  ShopMaterial,
  ShopProduct,
  ShopProductType,
  ShopShape,
  ShopSize,
  accessoryCategories,
  bagMaterials,
  shopHandles,
  shopProductTypes,
  shopShapes,
  shopSizes
} from "@/app/catalogue/shop-data";

export type ColourOption = {label: string; hex: string};

export const productStatuses = ["active", "draft", "archived"] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const productVisibilities = ["public", "private", "hidden"] as const;
export type ProductVisibility = (typeof productVisibilities)[number];

export const backorderPolicies = ["deny", "allow"] as const;
export type BackorderPolicy = (typeof backorderPolicies)[number];

export type AdminProduct = ShopProduct & {
  images: string[];
  imageZoomEnabled: boolean;
  description: string | null;
  shortDescription: string | null;
  tags: string[];
  collections: string[];
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
  // Denormalized here (not just the id) so every read site  -  storefront
  // Dimensions accordion, admin list/form  -  has the real measurements
  // without a second fetch. Null means "unassigned," not "no body exists":
  // every product migrated from the old Small/Medium/Large size system
  // starts here until an admin picks the real body (see the body-shapes
  // migration notes).
  bodyShape: AdminBodyShape | null;
  subcategory: string | null;
  compareAtPriceIdr: number | null;
  costPriceIdr: number | null;
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

export const MAX_PRODUCT_IMAGES = 6;

const HEX_COLOUR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const colourOptionSchema = z.object({
  label: z.string().trim().min(1, "Every colour option needs a name."),
  hex: z.string().trim().regex(HEX_COLOUR_PATTERN, "Colour must be a valid hex code, e.g. #B7924B or #FFF.")
});

// Every per-type attribute is optional at the schema level  -  which fields
// are actually required is enforced per productType below, not here, since
// a Doll requiring "shape" (a Bags-only field) would be nonsensical.
const shopProductInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  priceIdr: z.coerce.number().int().positive("Price must be a positive number."),
  description: z.string().trim().optional(),
  productType: z.enum(shopProductTypes as unknown as [string, ...string[]]) as unknown as z.ZodType<ShopProductType>,
  bodyShapeId: z.string().trim().min(1).optional(),
  size: (z.enum(shopSizes as unknown as [string, ...string[]]) as unknown as z.ZodType<ShopSize>).optional(),
  shape: (z.enum(shopShapes as unknown as [string, ...string[]]) as unknown as z.ZodType<ShopShape>).optional(),
  handle: (z.enum(shopHandles as unknown as [string, ...string[]]) as unknown as z.ZodType<ShopHandle>).optional(),
  accessoryCategory: (
    z.enum(accessoryCategories as unknown as [string, ...string[]]) as unknown as z.ZodType<AccessoryCategory>
  ).optional(),
  materials: z.array(z.string()).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  collections: z.array(z.string().trim().min(1)).optional(),
  shortDescription: z.string().trim().max(160, "Short description must be 160 characters or fewer.").optional(),
  subcategory: z.string().trim().optional(),
  vendor: z.string().trim().optional(),
  metaTitle: z.string().trim().optional(),
  metaDescription: z.string().trim().optional(),
  status: (z.enum(productStatuses as unknown as [string, ...string[]]) as unknown as z.ZodType<ProductStatus>).optional(),
  visibility: (
    z.enum(productVisibilities as unknown as [string, ...string[]]) as unknown as z.ZodType<ProductVisibility>
  ).optional(),
  allowBackorders: (
    z.enum(backorderPolicies as unknown as [string, ...string[]]) as unknown as z.ZodType<BackorderPolicy>
  ).optional(),
  personalisationOptions: z.array(z.string().trim().min(1)).optional()
});

// Partial variant for edits: every field optional, only what's present gets
// validated and applied.
const shopProductUpdateSchema = shopProductInputSchema.partial();

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(base: string) {
  const safeBase = base || "product";
  const taken = new Set((await db.select({slug: products.slug}).from(products)).map((row) => row.slug));

  if (!taken.has(safeBase)) {
    return safeBase;
  }

  let suffix = 2;
  while (taken.has(`${safeBase}-${suffix}`)) {
    suffix += 1;
  }
  return `${safeBase}-${suffix}`;
}

// Both fields are optional and "cleared" (empty input) means null, not 0 or
// ""  -  handled outside the zod object above since that clear-to-null
// behavior doesn't fit the shared create/.partial() update schema cleanly.
function parseStockField(formData: FormData): number | null {
  const raw = formData.get("stock");
  if (raw === null || raw.toString().trim() === "") {
    return null;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Stock must be a whole number of 0 or more.");
  }
  return value;
}

// Same "empty input clears to null" behavior as stock/productCode above.
function parseDimensionsField(formData: FormData): string | null {
  const raw = formData.get("dimensions");
  if (raw === null || raw.toString().trim() === "") {
    return null;
  }
  return raw.toString().trim();
}

// Shared by compareAtPriceIdr/costPriceIdr/lowStockThreshold below - all
// three are optional positive-or-zero integers that clear to null on an
// empty input, same convention as stock.
function parseOptionalIntField(formData: FormData, field: string, label: string): number | null {
  const raw = formData.get(field);
  if (raw === null || raw.toString().trim() === "") {
    return null;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a whole number of 0 or more.`);
  }
  return value;
}

// publishedAt travels as an ISO/datetime-local string or is absent
// entirely; empty clears it back to null (e.g. moving a product back to
// draft in the same edit).
function parsePublishedAtField(formData: FormData): Date | null {
  const raw = formData.get("publishedAt");
  if (raw === null || raw.toString().trim() === "") {
    return null;
  }
  const date = new Date(raw.toString());
  if (Number.isNaN(date.getTime())) {
    throw new Error("Published date is invalid.");
  }
  return date;
}

function parseProductCodeField(formData: FormData): string | null {
  const raw = formData.get("productCode");
  if (raw === null || raw.toString().trim() === "") {
    return null;
  }
  const code = raw.toString().trim();
  if (!code.startsWith(PRODUCT_CODE_PREFIX) || code.length === PRODUCT_CODE_PREFIX.length) {
    throw new Error(`Product code must start with "${PRODUCT_CODE_PREFIX}" and include a code after it.`);
  }
  return code;
}

// Images are uploaded up front (see app/api/admin/products/images/route.ts)
// and arrive here as already-hosted URLs in their final, admin-chosen order
// (position 0 is the main image) - this just validates the count.
function parseImagesField(formData: FormData): string[] {
  const images = formData.getAll("images").map(String).filter(Boolean);
  if (images.length > MAX_PRODUCT_IMAGES) {
    throw new Error(`A product can have at most ${MAX_PRODUCT_IMAGES} images.`);
  }
  return images;
}

// Colour options travel as a JSON string (a plain repeated form field can't
// carry an ordered array of {label, hex} objects) and are re-validated here
// regardless of what the admin form already checked client-side - a hex
// value never reaches the database unvalidated.
function parseColourOptionsField(formData: FormData, field: string): ColourOption[] {
  const raw = formData.get(field);
  if (raw === null || raw.toString().trim() === "") {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString());
  } catch {
    throw new Error("Colour options were malformed.");
  }
  const result = z.array(colourOptionSchema).safeParse(parsed);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid colour option.");
  }
  return result.data;
}

function toAdminProduct(row: typeof products.$inferSelect, bodyShape: AdminBodyShape | null): AdminProduct {
  return {
    slug: row.slug,
    name: row.name,
    priceIdr: row.priceIdr,
    compareAtPriceIdr: row.compareAtPriceIdr,
    costPriceIdr: row.costPriceIdr,
    imageUrl: row.images[0] ?? "",
    images: row.images,
    imageZoomEnabled: row.imageZoomEnabled,
    description: row.description,
    shortDescription: row.shortDescription,
    productType: row.productType as ShopProductType,
    subcategory: row.subcategory,
    materials: row.materials as ShopMaterial[],
    size: (row.size as ShopSize) ?? null,
    shape: (row.shape as ShopShape) ?? null,
    handle: (row.handleType as ShopHandle) ?? null,
    accessoryCategory: (row.accessoryCategory as AccessoryCategory) ?? null,
    tags: row.tags,
    collections: row.collections,
    soldOut: row.soldOut,
    isActive: row.isActive,
    status: row.status as ProductStatus,
    visibility: row.visibility as ProductVisibility,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
    allowBackorders: row.allowBackorders as BackorderPolicy,
    productCode: row.productCode,
    vendor: row.vendor,
    dimensions: row.dimensions,
    bodyShapeId: row.bodyShapeId,
    bodyShape,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    hasBaseColour: row.hasBaseColour,
    baseColourOptions: (row.baseColourOptions as ColourOption[] | null) ?? [],
    hasHandleColour: row.hasHandleColour,
    handleColourOptions: (row.handleColourOptions as ColourOption[] | null) ?? [],
    hasPersonalisation: row.hasPersonalisation,
    personalisationOptions: (row.personalisationOptions as string[] | null) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

// isActive is the one column every existing query/RLS policy still filters
// on; status/visibility are the richer admin-facing fields that must stay
// in sync with it on every write, computed here rather than trusted from
// the client. A draft or archived product is never active regardless of
// visibility; an active-but-hidden one is treated the same as inactive.
function computeIsActive(status: ProductStatus, visibility: ProductVisibility): boolean {
  return status === "active" && visibility !== "hidden";
}

async function assertProductCodeAvailable(code: string, excludeSlug?: string) {
  const [existing] = await db.select({slug: products.slug}).from(products).where(eq(products.productCode, code));
  if (existing && existing.slug !== excludeSlug) {
    throw new Error(`Product code "${code}" is already in use.`);
  }
}

// Each product type owns its own required-field set and its own valid
// materials list  -  a Bag can only carry bagMaterials, Dolls/Accessories/
// Apparel carry none. `requireBody` is only true on creation: a brand new
// Bag/Doll must pick a real body from the catalog (see the product form's
// Body dropdown), but an existing product migrated from the old Small/
// Medium/Large size system starts with no body assigned at all (see the
// body-shapes migration), and every other edit to that product (price,
// stock, hiding it, etc.) must keep working without forcing the admin to
// assign a body first  -  that's a deliberate, gradual, admin-driven
// migration, not a blocking requirement.
function attributesForType(
  productType: ShopProductType,
  parsed: {
    bodyShapeId?: string;
    size?: ShopSize;
    shape?: ShopShape;
    handle?: ShopHandle;
    accessoryCategory?: AccessoryCategory;
    materials?: string[];
  },
  options: {requireBody: boolean; requireSize: boolean}
): {
  bodyShapeId: string | null;
  size: ShopSize | null;
  shape: ShopShape | null;
  handleType: ShopHandle | null;
  accessoryCategory: AccessoryCategory | null;
  materials: ShopMaterial[];
} {
  if (productType === "Bags") {
    if (!parsed.shape || !parsed.handle) {
      throw new Error("Shape and handle are required for bags.");
    }
    if (options.requireBody && !parsed.bodyShapeId) {
      throw new Error("Body is required for bags.");
    }
    if (options.requireSize && !parsed.size) {
      throw new Error("Size is required for bags.");
    }
    const materials = (parsed.materials ?? []).filter((value): value is ShopMaterial =>
      bagMaterials.includes(value as ShopMaterial)
    );
    if (!materials.length) {
      throw new Error("Pick at least one material.");
    }
    return {
      bodyShapeId: parsed.bodyShapeId ?? null,
      size: parsed.size ?? null,
      shape: parsed.shape,
      handleType: parsed.handle,
      accessoryCategory: null,
      materials
    };
  }

  if (productType === "Dolls") {
    if (options.requireBody && !parsed.bodyShapeId) {
      throw new Error("Body is required for dolls.");
    }
    if (options.requireSize && !parsed.size) {
      throw new Error("Size is required for dolls.");
    }
    return {
      bodyShapeId: parsed.bodyShapeId ?? null,
      size: parsed.size ?? null,
      shape: null,
      handleType: null,
      accessoryCategory: null,
      materials: []
    };
  }

  if (productType === "Accessories") {
    if (!parsed.accessoryCategory) {
      throw new Error("Category is required for accessories.");
    }
    return {bodyShapeId: null, size: null, shape: null, handleType: null, accessoryCategory: parsed.accessoryCategory, materials: []};
  }

  // Apparel: no per-type attributes at all.
  return {bodyShapeId: null, size: null, shape: null, handleType: null, accessoryCategory: null, materials: []};
}

function toAdminBodyShapeRow(row: typeof bodyShapes.$inferSelect | null): AdminBodyShape | null {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    shapeType: row.shapeType as AdminBodyShape["shapeType"],
    widthCm: row.widthCm,
    widthBottomCm: row.widthBottomCm,
    heightCm: row.heightCm,
    depthCm: row.depthCm,
    diameterCm: row.diameterCm,
    thicknessCm: row.thicknessCm,
    inStock: row.inStock,
    notes: row.notes,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

// Public catalogue feed: isActive gates whether the storefront can serve
// the product at all, and visibility = 'public' additionally gates whether
// it's *listed*  -  a 'private' product stays isActive but is excluded here
// (still reachable directly via getProductBySlug below, e.g. a preview
// link shared before launch).
export async function getAllProducts(): Promise<AdminProduct[]> {
  const rows = await db
    .select({product: products, body: bodyShapes})
    .from(products)
    .leftJoin(bodyShapes, eq(products.bodyShapeId, bodyShapes.id))
    .where(and(eq(products.isActive, true), eq(products.visibility, "public")))
    .orderBy(desc(products.createdAt));
  return rows.map((row) => toAdminProduct(row.product, toAdminBodyShapeRow(row.body)));
}

// Public: the product detail page's single source of truth for one product.
// Deliberately mirrors getAllProducts' isActive filter  -  a deactivated
// product must stay invisible on its own detail page the same way it's
// invisible in the catalogue grid, not just hidden from listings.
export async function getProductBySlug(slug: string): Promise<AdminProduct | null> {
  const [row] = await db
    .select({product: products, body: bodyShapes})
    .from(products)
    .leftJoin(bodyShapes, eq(products.bodyShapeId, bodyShapes.id))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)));
  return row ? toAdminProduct(row.product, toAdminBodyShapeRow(row.body)) : null;
}

// Admin-only: includes deactivated products so the Manage Products view can
// still find and reactivate them, unlike the public catalogue feed above.
export async function getAllProductsForAdmin(): Promise<AdminProduct[]> {
  const rows = await db
    .select({product: products, body: bodyShapes})
    .from(products)
    .leftJoin(bodyShapes, eq(products.bodyShapeId, bodyShapes.id))
    .orderBy(desc(products.createdAt));
  return rows.map((row) => toAdminProduct(row.product, toAdminBodyShapeRow(row.body)));
}

export async function createProduct(formData: FormData): Promise<AdminProduct> {
  const parsed = shopProductInputSchema.parse({
    name: formData.get("name"),
    priceIdr: formData.get("priceIdr"),
    description: formData.get("description") ?? undefined,
    productType: formData.get("productType"),
    bodyShapeId: formData.get("bodyShapeId") || undefined,
    size: formData.get("size") || undefined,
    shape: formData.get("shape") || undefined,
    handle: formData.get("handle") || undefined,
    accessoryCategory: formData.get("accessoryCategory") || undefined,
    materials: formData.getAll("materials").map(String),
    tags: formData.getAll("tags").map(String),
    collections: formData.getAll("collections").map(String),
    shortDescription: formData.get("shortDescription") || undefined,
    subcategory: formData.get("subcategory") || undefined,
    vendor: formData.get("vendor") || undefined,
    metaTitle: formData.get("metaTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
    status: formData.get("status") || undefined,
    visibility: formData.get("visibility") || undefined,
    allowBackorders: formData.get("allowBackorders") || undefined,
    personalisationOptions: formData.getAll("personalisationOptions").map(String)
  });

  const attributes = attributesForType(parsed.productType, parsed, {requireBody: true, requireSize: true});
  if (attributes.bodyShapeId) {
    await assertBodyShapeExists(attributes.bodyShapeId);
  }

  const images = parseImagesField(formData);
  if (!images.length) {
    throw new Error("At least one image is required.");
  }

  const stock = parseStockField(formData);
  const productCode = parseProductCodeField(formData);
  if (productCode) {
    await assertProductCodeAvailable(productCode);
  }
  const dimensions = parseDimensionsField(formData);
  const hasBaseColour = formData.get("hasBaseColour") === "true";
  const baseColourOptions = hasBaseColour ? parseColourOptionsField(formData, "baseColourOptions") : [];
  const hasHandleColour = formData.get("hasHandleColour") === "true";
  const handleColourOptions = hasHandleColour ? parseColourOptionsField(formData, "handleColourOptions") : [];
  const hasPersonalisation = formData.get("hasPersonalisation") === "true";
  const personalisationOptions = hasPersonalisation ? (parsed.personalisationOptions ?? []) : [];

  const compareAtPriceIdr = parseOptionalIntField(formData, "compareAtPriceIdr", "Compare-at price");
  const costPriceIdr = parseOptionalIntField(formData, "costPriceIdr", "Cost price");
  const lowStockThreshold = parseOptionalIntField(formData, "lowStockThreshold", "Low stock threshold");

  const status: ProductStatus = parsed.status ?? "active";
  const visibility: ProductVisibility = parsed.visibility ?? "public";
  const publishedAtInput = parsePublishedAtField(formData);
  const publishedAt = publishedAtInput ?? (status === "active" ? new Date() : null);

  const description = parsed.description ? sanitizeDescriptionHtml(parsed.description) : null;

  const slug = await uniqueSlug(slugify(parsed.name));

  const [row] = await db
    .insert(products)
    .values({
      slug,
      name: parsed.name,
      priceIdr: parsed.priceIdr,
      compareAtPriceIdr,
      costPriceIdr,
      description,
      shortDescription: parsed.shortDescription ?? null,
      images,
      imageZoomEnabled: formData.get("imageZoomEnabled") !== "false",
      productType: parsed.productType,
      subcategory: parsed.subcategory ?? null,
      materials: attributes.materials,
      bodyShapeId: attributes.bodyShapeId,
      size: attributes.size,
      shape: attributes.shape,
      handleType: attributes.handleType,
      accessoryCategory: attributes.accessoryCategory,
      tags: parsed.tags ?? [],
      collections: parsed.collections ?? [],
      status,
      visibility,
      publishedAt,
      isActive: computeIsActive(status, visibility),
      stock,
      lowStockThreshold,
      allowBackorders: parsed.allowBackorders ?? "deny",
      productCode,
      vendor: parsed.vendor ?? null,
      metaTitle: parsed.metaTitle ?? null,
      metaDescription: parsed.metaDescription ?? null,
      dimensions,
      hasBaseColour,
      baseColourOptions,
      hasHandleColour,
      handleColourOptions,
      hasPersonalisation,
      personalisationOptions
    })
    .returning();

  return toAdminProduct(row, await getBodyShapeById(row.bodyShapeId));
}

export async function updateProduct(slug: string, formData: FormData): Promise<AdminProduct> {
  const [existing] = await db.select().from(products).where(eq(products.slug, slug));
  if (!existing) {
    throw new Error("Product not found.");
  }

  const raw: Record<string, unknown> = {};
  if (formData.has("name")) raw.name = formData.get("name");
  if (formData.has("priceIdr")) raw.priceIdr = formData.get("priceIdr");
  if (formData.has("description")) raw.description = formData.get("description");
  if (formData.has("productType")) raw.productType = formData.get("productType");
  if (formData.has("bodyShapeId")) raw.bodyShapeId = formData.get("bodyShapeId") || undefined;
  if (formData.has("size")) raw.size = formData.get("size") || undefined;
  if (formData.has("shape")) raw.shape = formData.get("shape") || undefined;
  if (formData.has("handle")) raw.handle = formData.get("handle") || undefined;
  if (formData.has("accessoryCategory")) raw.accessoryCategory = formData.get("accessoryCategory") || undefined;
  if (formData.getAll("materials").length) raw.materials = formData.getAll("materials").map(String);
  if (formData.getAll("tags").length) raw.tags = formData.getAll("tags").map(String);
  if (formData.getAll("collections").length) raw.collections = formData.getAll("collections").map(String);
  if (formData.has("shortDescription")) raw.shortDescription = formData.get("shortDescription") || undefined;
  if (formData.has("subcategory")) raw.subcategory = formData.get("subcategory") || undefined;
  if (formData.has("vendor")) raw.vendor = formData.get("vendor") || undefined;
  if (formData.has("metaTitle")) raw.metaTitle = formData.get("metaTitle") || undefined;
  if (formData.has("metaDescription")) raw.metaDescription = formData.get("metaDescription") || undefined;
  if (formData.has("status")) raw.status = formData.get("status") || undefined;
  if (formData.has("visibility")) raw.visibility = formData.get("visibility") || undefined;
  if (formData.has("allowBackorders")) raw.allowBackorders = formData.get("allowBackorders") || undefined;
  if (formData.has("hasPersonalisation")) raw.personalisationOptions = formData.getAll("personalisationOptions").map(String);

  const parsed = shopProductUpdateSchema.parse(raw);
  if (parsed.bodyShapeId) {
    await assertBodyShapeExists(parsed.bodyShapeId);
  }

  const stock = formData.has("stock") ? parseStockField(formData) : existing.stock;
  const productCode = formData.has("productCode") ? parseProductCodeField(formData) : existing.productCode;
  if (productCode && productCode !== existing.productCode) {
    await assertProductCodeAvailable(productCode, slug);
  }
  const dimensions = formData.has("dimensions") ? parseDimensionsField(formData) : existing.dimensions;
  const hasBaseColour = formData.has("hasBaseColour") ? formData.get("hasBaseColour") === "true" : existing.hasBaseColour;
  const baseColourOptions = hasBaseColour
    ? formData.has("baseColourOptions")
      ? parseColourOptionsField(formData, "baseColourOptions")
      : ((existing.baseColourOptions as ColourOption[] | null) ?? [])
    : [];
  const hasHandleColour = formData.has("hasHandleColour")
    ? formData.get("hasHandleColour") === "true"
    : existing.hasHandleColour;
  const handleColourOptions = hasHandleColour
    ? formData.has("handleColourOptions")
      ? parseColourOptionsField(formData, "handleColourOptions")
      : ((existing.handleColourOptions as ColourOption[] | null) ?? [])
    : [];
  const hasPersonalisation = formData.has("hasPersonalisation")
    ? formData.get("hasPersonalisation") === "true"
    : existing.hasPersonalisation;
  const personalisationOptions = hasPersonalisation
    ? (parsed.personalisationOptions ?? (existing.personalisationOptions as string[] | null) ?? [])
    : [];

  const compareAtPriceIdr = formData.has("compareAtPriceIdr")
    ? parseOptionalIntField(formData, "compareAtPriceIdr", "Compare-at price")
    : existing.compareAtPriceIdr;
  const costPriceIdr = formData.has("costPriceIdr")
    ? parseOptionalIntField(formData, "costPriceIdr", "Cost price")
    : existing.costPriceIdr;
  const lowStockThreshold = formData.has("lowStockThreshold")
    ? parseOptionalIntField(formData, "lowStockThreshold", "Low stock threshold")
    : existing.lowStockThreshold;

  const status: ProductStatus = (parsed.status as ProductStatus | undefined) ?? (existing.status as ProductStatus);
  const visibility: ProductVisibility =
    (parsed.visibility as ProductVisibility | undefined) ?? (existing.visibility as ProductVisibility);
  // publishedAt: an explicit value in the form always wins; otherwise keep
  // the existing one, except the first time a product transitions into
  // 'active' with no publishedAt yet, which is treated as a real publish.
  const publishedAtInput = formData.has("publishedAt") ? parsePublishedAtField(formData) : undefined;
  const publishedAt =
    publishedAtInput !== undefined
      ? publishedAtInput
      : (existing.publishedAt ?? (status === "active" ? new Date() : null));

  // productType may not be changing on this edit  -  attribute validation
  // always runs against whichever type the product actually is (the
  // incoming type if it's being changed, otherwise the existing one), using
  // a merge of new + existing values so an edit that only touches, say,
  // price doesn't spuriously fail attribute validation.
  const effectiveType = parsed.productType ?? (existing.productType as ShopProductType);
  const attributes = attributesForType(
    effectiveType,
    {
      bodyShapeId: parsed.bodyShapeId ?? existing.bodyShapeId ?? undefined,
      size: (parsed.size as ShopSize | undefined) ?? (existing.size as ShopSize | undefined) ?? undefined,
      shape: (parsed.shape as ShopShape | undefined) ?? (existing.shape as ShopShape | undefined) ?? undefined,
      handle: (parsed.handle as ShopHandle | undefined) ?? (existing.handleType as ShopHandle | undefined) ?? undefined,
      accessoryCategory:
        (parsed.accessoryCategory as AccessoryCategory | undefined) ??
        (existing.accessoryCategory as AccessoryCategory | undefined) ??
        undefined,
      materials: parsed.materials ?? existing.materials
    },
    {requireBody: false, requireSize: false}
  );

  let images: string[] | undefined;
  if (formData.has("images")) {
    images = parseImagesField(formData);
    if (!images.length) {
      throw new Error("At least one image is required.");
    }
  }

  const [row] = await db
    .update(products)
    .set({
      ...(parsed.name !== undefined ? {name: parsed.name} : {}),
      ...(parsed.priceIdr !== undefined ? {priceIdr: parsed.priceIdr} : {}),
      ...(parsed.description !== undefined ? {description: sanitizeDescriptionHtml(parsed.description)} : {}),
      ...(parsed.shortDescription !== undefined ? {shortDescription: parsed.shortDescription} : {}),
      ...(parsed.productType !== undefined ? {productType: parsed.productType} : {}),
      ...(parsed.subcategory !== undefined ? {subcategory: parsed.subcategory} : {}),
      ...(parsed.vendor !== undefined ? {vendor: parsed.vendor} : {}),
      ...(parsed.metaTitle !== undefined ? {metaTitle: parsed.metaTitle} : {}),
      ...(parsed.metaDescription !== undefined ? {metaDescription: parsed.metaDescription} : {}),
      bodyShapeId: attributes.bodyShapeId,
      size: attributes.size,
      shape: attributes.shape,
      handleType: attributes.handleType,
      accessoryCategory: attributes.accessoryCategory,
      materials: attributes.materials,
      ...(parsed.tags !== undefined ? {tags: parsed.tags} : {}),
      ...(parsed.collections !== undefined ? {collections: parsed.collections} : {}),
      ...(parsed.allowBackorders !== undefined ? {allowBackorders: parsed.allowBackorders} : {}),
      status,
      visibility,
      publishedAt,
      isActive: computeIsActive(status, visibility),
      ...(images ? {images} : {}),
      ...(formData.has("imageZoomEnabled") ? {imageZoomEnabled: formData.get("imageZoomEnabled") !== "false"} : {}),
      stock,
      compareAtPriceIdr,
      costPriceIdr,
      lowStockThreshold,
      productCode,
      dimensions,
      hasBaseColour,
      baseColourOptions,
      hasHandleColour,
      handleColourOptions,
      hasPersonalisation,
      personalisationOptions,
      // A real publish supersedes any staged preview draft  -  keeps the
      // preview route from ever showing edits older than what's now live.
      draftData: null,
      updatedAt: new Date()
    })
    .where(eq(products.slug, slug))
    .returning();

  return toAdminProduct(row, await getBodyShapeById(row.bodyShapeId));
}

// The same admin-editable fields AdminProduct exposes, all optional since a
// draft is a partial overlay  -  identity/lifecycle fields (slug, status,
// visibility, publishedAt, isActive, createdAt, updatedAt) are deliberately
// excluded, since previewing a draft should show it as if published,
// regardless of the row's real current status/visibility.
type ProductDraftData = Partial<
  Omit<AdminProduct, "slug" | "status" | "visibility" | "publishedAt" | "isActive" | "createdAt" | "updatedAt">
>;

// Stages the admin edit form's current state without touching any live
// column - deliberately NOT the same code path as updateProduct (which
// writes live columns and is already relied on for real publishes). Reuses
// the same field parsers/validation so a draft can never hold data that
// wouldn't also be valid to publish.
export async function saveDraftProduct(slug: string, formData: FormData): Promise<void> {
  const [existing] = await db.select().from(products).where(eq(products.slug, slug));
  if (!existing) {
    throw new Error("Product not found.");
  }

  const raw: Record<string, unknown> = {};
  if (formData.has("name")) raw.name = formData.get("name");
  if (formData.has("priceIdr")) raw.priceIdr = formData.get("priceIdr");
  if (formData.has("description")) raw.description = formData.get("description");
  if (formData.has("productType")) raw.productType = formData.get("productType");
  if (formData.has("bodyShapeId")) raw.bodyShapeId = formData.get("bodyShapeId") || undefined;
  if (formData.has("size")) raw.size = formData.get("size") || undefined;
  if (formData.has("shape")) raw.shape = formData.get("shape") || undefined;
  if (formData.has("handle")) raw.handle = formData.get("handle") || undefined;
  if (formData.has("accessoryCategory")) raw.accessoryCategory = formData.get("accessoryCategory") || undefined;
  if (formData.getAll("materials").length) raw.materials = formData.getAll("materials").map(String);
  if (formData.getAll("tags").length) raw.tags = formData.getAll("tags").map(String);
  if (formData.getAll("collections").length) raw.collections = formData.getAll("collections").map(String);
  if (formData.has("shortDescription")) raw.shortDescription = formData.get("shortDescription") || undefined;
  if (formData.has("subcategory")) raw.subcategory = formData.get("subcategory") || undefined;
  if (formData.has("vendor")) raw.vendor = formData.get("vendor") || undefined;
  if (formData.has("metaTitle")) raw.metaTitle = formData.get("metaTitle") || undefined;
  if (formData.has("metaDescription")) raw.metaDescription = formData.get("metaDescription") || undefined;
  if (formData.has("allowBackorders")) raw.allowBackorders = formData.get("allowBackorders") || undefined;
  if (formData.has("hasPersonalisation")) raw.personalisationOptions = formData.getAll("personalisationOptions").map(String);

  const parsed = shopProductUpdateSchema.parse(raw);
  if (parsed.bodyShapeId) {
    await assertBodyShapeExists(parsed.bodyShapeId);
  }

  const stock = formData.has("stock") ? parseStockField(formData) : existing.stock;
  const productCode = formData.has("productCode") ? parseProductCodeField(formData) : existing.productCode;
  if (productCode && productCode !== existing.productCode) {
    await assertProductCodeAvailable(productCode, slug);
  }
  const dimensions = formData.has("dimensions") ? parseDimensionsField(formData) : existing.dimensions;
  const hasBaseColour = formData.has("hasBaseColour") ? formData.get("hasBaseColour") === "true" : existing.hasBaseColour;
  const baseColourOptions = hasBaseColour
    ? formData.has("baseColourOptions")
      ? parseColourOptionsField(formData, "baseColourOptions")
      : ((existing.baseColourOptions as ColourOption[] | null) ?? [])
    : [];
  const hasHandleColour = formData.has("hasHandleColour")
    ? formData.get("hasHandleColour") === "true"
    : existing.hasHandleColour;
  const handleColourOptions = hasHandleColour
    ? formData.has("handleColourOptions")
      ? parseColourOptionsField(formData, "handleColourOptions")
      : ((existing.handleColourOptions as ColourOption[] | null) ?? [])
    : [];
  const hasPersonalisation = formData.has("hasPersonalisation")
    ? formData.get("hasPersonalisation") === "true"
    : existing.hasPersonalisation;
  const personalisationOptions = hasPersonalisation
    ? (parsed.personalisationOptions ?? (existing.personalisationOptions as string[] | null) ?? [])
    : [];

  const compareAtPriceIdr = formData.has("compareAtPriceIdr")
    ? parseOptionalIntField(formData, "compareAtPriceIdr", "Compare-at price")
    : existing.compareAtPriceIdr;
  const costPriceIdr = formData.has("costPriceIdr")
    ? parseOptionalIntField(formData, "costPriceIdr", "Cost price")
    : existing.costPriceIdr;
  const lowStockThreshold = formData.has("lowStockThreshold")
    ? parseOptionalIntField(formData, "lowStockThreshold", "Low stock threshold")
    : existing.lowStockThreshold;

  const effectiveType = parsed.productType ?? (existing.productType as ShopProductType);
  const attributes = attributesForType(
    effectiveType,
    {
      bodyShapeId: parsed.bodyShapeId ?? existing.bodyShapeId ?? undefined,
      size: (parsed.size as ShopSize | undefined) ?? (existing.size as ShopSize | undefined) ?? undefined,
      shape: (parsed.shape as ShopShape | undefined) ?? (existing.shape as ShopShape | undefined) ?? undefined,
      handle: (parsed.handle as ShopHandle | undefined) ?? (existing.handleType as ShopHandle | undefined) ?? undefined,
      accessoryCategory:
        (parsed.accessoryCategory as AccessoryCategory | undefined) ??
        (existing.accessoryCategory as AccessoryCategory | undefined) ??
        undefined,
      materials: parsed.materials ?? existing.materials
    },
    {requireBody: false, requireSize: false}
  );

  let images = existing.images;
  if (formData.has("images")) {
    images = parseImagesField(formData);
    if (!images.length) {
      throw new Error("At least one image is required.");
    }
  }

  const draft: ProductDraftData = {
    name: parsed.name ?? existing.name,
    priceIdr: parsed.priceIdr ?? existing.priceIdr,
    compareAtPriceIdr,
    costPriceIdr,
    description: parsed.description !== undefined ? sanitizeDescriptionHtml(parsed.description) : existing.description,
    shortDescription: parsed.shortDescription ?? existing.shortDescription,
    images,
    imageZoomEnabled: formData.has("imageZoomEnabled") ? formData.get("imageZoomEnabled") !== "false" : existing.imageZoomEnabled,
    productType: effectiveType,
    subcategory: parsed.subcategory ?? existing.subcategory,
    materials: attributes.materials,
    size: attributes.size,
    shape: attributes.shape,
    handle: attributes.handleType,
    accessoryCategory: attributes.accessoryCategory,
    tags: parsed.tags ?? existing.tags,
    collections: parsed.collections ?? existing.collections,
    stock,
    lowStockThreshold,
    allowBackorders: (parsed.allowBackorders as BackorderPolicy | undefined) ?? (existing.allowBackorders as BackorderPolicy),
    productCode,
    vendor: parsed.vendor ?? existing.vendor,
    dimensions,
    bodyShapeId: attributes.bodyShapeId,
    bodyShape: await getBodyShapeById(attributes.bodyShapeId),
    metaTitle: parsed.metaTitle ?? existing.metaTitle,
    metaDescription: parsed.metaDescription ?? existing.metaDescription,
    hasBaseColour,
    baseColourOptions,
    hasHandleColour,
    handleColourOptions,
    hasPersonalisation,
    personalisationOptions
  };

  await db.update(products).set({draftData: draft}).where(eq(products.slug, slug));
}

// Admin-only: fetches a product regardless of its real isActive/visibility
// (a draft/archived/hidden product must still be previewable), with any
// staged draftData overlaid on top so the preview reflects unsaved edits,
// not just what's already published. Never used by any public route.
export async function getProductForPreview(slug: string): Promise<AdminProduct | null> {
  const [row] = await db.select().from(products).where(eq(products.slug, slug));
  if (!row) {
    return null;
  }
  const base = toAdminProduct(row, await getBodyShapeById(row.bodyShapeId));
  const draft = row.draftData as ProductDraftData | null;
  return draft ? {...base, ...draft} : base;
}

// order_items snapshot productName/priceIdr at order time with no foreign
// key back to `products`  -  so a hard delete here can never orphan or
// corrupt existing order history, even for a product that's been ordered
// before. Safe to call unconditionally.
export async function deleteProductPermanently(slug: string): Promise<boolean> {
  const [deleted] = await db.delete(products).where(eq(products.slug, slug)).returning({slug: products.slug});
  return Boolean(deleted);
}

// The simple list-row Hide/Unhide action. Deliberately only ever moves
// visibility, never status  -  "hide" here means "took this off the
// storefront for now," not "this was never really published," which is
// what the richer status field on the edit form is for. isActive is kept
// in lockstep the same way createProduct/updateProduct do.
export async function setProductActive(slug: string, isActive: boolean): Promise<AdminProduct> {
  const [existing] = await db.select({status: products.status}).from(products).where(eq(products.slug, slug));
  if (!existing) {
    throw new Error("Product not found.");
  }
  const status = existing.status as ProductStatus;
  const visibility: ProductVisibility = isActive ? "public" : "hidden";
  const [row] = await db
    .update(products)
    .set({isActive: computeIsActive(status, visibility), visibility, updatedAt: new Date()})
    .where(eq(products.slug, slug))
    .returning();
  if (!row) {
    throw new Error("Product not found.");
  }
  return toAdminProduct(row, await getBodyShapeById(row.bodyShapeId));
}
