import {and, desc, eq} from "drizzle-orm";
import {z} from "zod";
import {db, products} from "@/lib/db";
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

export type AdminProduct = ShopProduct & {
  images: string[];
  description: string | null;
  tags: string[];
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
  size: (z.enum(shopSizes as unknown as [string, ...string[]]) as unknown as z.ZodType<ShopSize>).optional(),
  shape: (z.enum(shopShapes as unknown as [string, ...string[]]) as unknown as z.ZodType<ShopShape>).optional(),
  handle: (z.enum(shopHandles as unknown as [string, ...string[]]) as unknown as z.ZodType<ShopHandle>).optional(),
  accessoryCategory: (
    z.enum(accessoryCategories as unknown as [string, ...string[]]) as unknown as z.ZodType<AccessoryCategory>
  ).optional(),
  materials: z.array(z.string()).optional(),
  tags: z.array(z.string().trim().min(1)).optional()
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

function toAdminProduct(row: typeof products.$inferSelect): AdminProduct {
  return {
    slug: row.slug,
    name: row.name,
    priceIdr: row.priceIdr,
    imageUrl: row.images[0] ?? "",
    images: row.images,
    description: row.description,
    productType: row.productType as ShopProductType,
    materials: row.materials as ShopMaterial[],
    size: (row.size as ShopSize) ?? null,
    shape: (row.shape as ShopShape) ?? null,
    handle: (row.handleType as ShopHandle) ?? null,
    accessoryCategory: (row.accessoryCategory as AccessoryCategory) ?? null,
    tags: row.tags,
    soldOut: row.soldOut,
    isActive: row.isActive,
    stock: row.stock,
    productCode: row.productCode,
    dimensions: row.dimensions,
    hasBaseColour: row.hasBaseColour,
    baseColourOptions: (row.baseColourOptions as ColourOption[] | null) ?? [],
    hasHandleColour: row.hasHandleColour,
    handleColourOptions: (row.handleColourOptions as ColourOption[] | null) ?? [],
    updatedAt: row.updatedAt.toISOString()
  };
}

async function assertProductCodeAvailable(code: string, excludeSlug?: string) {
  const [existing] = await db.select({slug: products.slug}).from(products).where(eq(products.productCode, code));
  if (existing && existing.slug !== excludeSlug) {
    throw new Error(`Product code "${code}" is already in use.`);
  }
}

// Each product type owns its own required-field set and its own valid
// materials list  -  a Bag can only carry bagMaterials, Dolls/Accessories/
// Apparel carry none.
function attributesForType(
  productType: ShopProductType,
  parsed: {
    size?: ShopSize;
    shape?: ShopShape;
    handle?: ShopHandle;
    accessoryCategory?: AccessoryCategory;
    materials?: string[];
  }
): {
  size: ShopSize | null;
  shape: ShopShape | null;
  handleType: ShopHandle | null;
  accessoryCategory: AccessoryCategory | null;
  materials: ShopMaterial[];
} {
  if (productType === "Bags") {
    if (!parsed.size || !parsed.shape || !parsed.handle) {
      throw new Error("Size, shape, and handle are required for bags.");
    }
    const materials = (parsed.materials ?? []).filter((value): value is ShopMaterial =>
      bagMaterials.includes(value as ShopMaterial)
    );
    if (!materials.length) {
      throw new Error("Pick at least one material.");
    }
    return {size: parsed.size, shape: parsed.shape, handleType: parsed.handle, accessoryCategory: null, materials};
  }

  if (productType === "Dolls") {
    if (!parsed.size) {
      throw new Error("Size is required for dolls.");
    }
    return {size: parsed.size, shape: null, handleType: null, accessoryCategory: null, materials: []};
  }

  if (productType === "Accessories") {
    if (!parsed.accessoryCategory) {
      throw new Error("Category is required for accessories.");
    }
    return {size: null, shape: null, handleType: null, accessoryCategory: parsed.accessoryCategory, materials: []};
  }

  // Apparel: no per-type attributes at all.
  return {size: null, shape: null, handleType: null, accessoryCategory: null, materials: []};
}

export async function getAllProducts(): Promise<AdminProduct[]> {
  const rows = await db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
  return rows.map(toAdminProduct);
}

// Public: the product detail page's single source of truth for one product.
// Deliberately mirrors getAllProducts' isActive filter  -  a deactivated
// product must stay invisible on its own detail page the same way it's
// invisible in the catalogue grid, not just hidden from listings.
export async function getProductBySlug(slug: string): Promise<AdminProduct | null> {
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.isActive, true)));
  return row ? toAdminProduct(row) : null;
}

// Admin-only: includes deactivated products so the Manage Products view can
// still find and reactivate them, unlike the public catalogue feed above.
export async function getAllProductsForAdmin(): Promise<AdminProduct[]> {
  const rows = await db.select().from(products).orderBy(desc(products.createdAt));
  return rows.map(toAdminProduct);
}

export async function createProduct(formData: FormData): Promise<AdminProduct> {
  const parsed = shopProductInputSchema.parse({
    name: formData.get("name"),
    priceIdr: formData.get("priceIdr"),
    description: formData.get("description") ?? undefined,
    productType: formData.get("productType"),
    size: formData.get("size") || undefined,
    shape: formData.get("shape") || undefined,
    handle: formData.get("handle") || undefined,
    accessoryCategory: formData.get("accessoryCategory") || undefined,
    materials: formData.getAll("materials").map(String),
    tags: formData.getAll("tags").map(String)
  });

  const attributes = attributesForType(parsed.productType, parsed);

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

  const slug = await uniqueSlug(slugify(parsed.name));

  const [row] = await db
    .insert(products)
    .values({
      slug,
      name: parsed.name,
      priceIdr: parsed.priceIdr,
      description: parsed.description ?? null,
      images,
      productType: parsed.productType,
      materials: attributes.materials,
      size: attributes.size,
      shape: attributes.shape,
      handleType: attributes.handleType,
      accessoryCategory: attributes.accessoryCategory,
      tags: parsed.tags ?? [],
      stock,
      productCode,
      dimensions,
      hasBaseColour,
      baseColourOptions,
      hasHandleColour,
      handleColourOptions
    })
    .returning();

  return toAdminProduct(row);
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
  if (formData.has("size")) raw.size = formData.get("size") || undefined;
  if (formData.has("shape")) raw.shape = formData.get("shape") || undefined;
  if (formData.has("handle")) raw.handle = formData.get("handle") || undefined;
  if (formData.has("accessoryCategory")) raw.accessoryCategory = formData.get("accessoryCategory") || undefined;
  if (formData.getAll("materials").length) raw.materials = formData.getAll("materials").map(String);
  if (formData.getAll("tags").length) raw.tags = formData.getAll("tags").map(String);

  const parsed = shopProductUpdateSchema.parse(raw);

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

  // productType may not be changing on this edit  -  attribute validation
  // always runs against whichever type the product actually is (the
  // incoming type if it's being changed, otherwise the existing one), using
  // a merge of new + existing values so an edit that only touches, say,
  // price doesn't spuriously fail attribute validation.
  const effectiveType = parsed.productType ?? (existing.productType as ShopProductType);
  const attributes = attributesForType(effectiveType, {
    size: (parsed.size as ShopSize | undefined) ?? (existing.size as ShopSize | undefined) ?? undefined,
    shape: (parsed.shape as ShopShape | undefined) ?? (existing.shape as ShopShape | undefined) ?? undefined,
    handle: (parsed.handle as ShopHandle | undefined) ?? (existing.handleType as ShopHandle | undefined) ?? undefined,
    accessoryCategory:
      (parsed.accessoryCategory as AccessoryCategory | undefined) ??
      (existing.accessoryCategory as AccessoryCategory | undefined) ??
      undefined,
    materials: parsed.materials ?? existing.materials
  });

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
      ...(parsed.description !== undefined ? {description: parsed.description} : {}),
      ...(parsed.productType !== undefined ? {productType: parsed.productType} : {}),
      size: attributes.size,
      shape: attributes.shape,
      handleType: attributes.handleType,
      accessoryCategory: attributes.accessoryCategory,
      materials: attributes.materials,
      ...(parsed.tags !== undefined ? {tags: parsed.tags} : {}),
      ...(images ? {images} : {}),
      stock,
      productCode,
      dimensions,
      hasBaseColour,
      baseColourOptions,
      hasHandleColour,
      handleColourOptions,
      updatedAt: new Date()
    })
    .where(eq(products.slug, slug))
    .returning();

  return toAdminProduct(row);
}

// order_items snapshot productName/priceIdr at order time with no foreign
// key back to `products`  -  so a hard delete here can never orphan or
// corrupt existing order history, even for a product that's been ordered
// before. Safe to call unconditionally.
export async function deleteProductPermanently(slug: string): Promise<boolean> {
  const [deleted] = await db.delete(products).where(eq(products.slug, slug)).returning({slug: products.slug});
  return Boolean(deleted);
}

export async function setProductActive(slug: string, isActive: boolean): Promise<AdminProduct> {
  const [row] = await db
    .update(products)
    .set({isActive, updatedAt: new Date()})
    .where(eq(products.slug, slug))
    .returning();
  if (!row) {
    throw new Error("Product not found.");
  }
  return toAdminProduct(row);
}
