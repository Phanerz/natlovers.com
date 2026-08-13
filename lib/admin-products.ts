import {desc, eq} from "drizzle-orm";
import {z} from "zod";
import {uploadFile} from "@/lib/blob";
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

const IMAGE_PREFIX = "products";

export type AdminProduct = ShopProduct & {
  images: string[];
  description: string | null;
  tags: string[];
  isActive: boolean;
  updatedAt: string;
};

// Every per-type attribute is optional at the schema level — which fields
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
    updatedAt: row.updatedAt.toISOString()
  };
}

async function uploadImages(slug: string, files: File[]): Promise<string[]> {
  return Promise.all(
    files.map((file, index) => {
      const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      return uploadFile(`${IMAGE_PREFIX}/${slug}-${Date.now()}-${index}.${extension}`, file);
    })
  );
}

function collectImageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

// Each product type owns its own required-field set and its own valid
// materials list — a Bag can only carry bagMaterials, Dolls/Accessories/
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

  const imageFiles = collectImageFiles(formData);
  if (!imageFiles.length) {
    throw new Error("At least one image is required.");
  }

  const slug = await uniqueSlug(slugify(parsed.name));
  const images = await uploadImages(slug, imageFiles);

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
      tags: parsed.tags ?? []
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

  // productType may not be changing on this edit — attribute validation
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

  const imageFiles = collectImageFiles(formData);
  const images = imageFiles.length ? await uploadImages(slug, imageFiles) : undefined;

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
      updatedAt: new Date()
    })
    .where(eq(products.slug, slug))
    .returning();

  return toAdminProduct(row);
}

export async function deactivateProduct(slug: string) {
  await db
    .update(products)
    .set({isActive: false, updatedAt: new Date()})
    .where(eq(products.slug, slug));
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
