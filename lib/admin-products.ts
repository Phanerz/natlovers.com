import {desc, eq} from "drizzle-orm";
import {z} from "zod";
import {uploadFile} from "@/lib/blob";
import {db, products} from "@/lib/db";
import {
  ShopHandle,
  ShopMaterial,
  ShopProduct,
  ShopProductType,
  ShopShape,
  ShopSize,
  shopHandles,
  shopMaterials,
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
};

const shopProductInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  priceIdr: z.coerce.number().int().positive("Price must be a positive number."),
  description: z.string().trim().optional(),
  productType: z.enum(shopProductTypes as unknown as [string, ...string[]]) as unknown as z.ZodType<ShopProductType>,
  size: z.enum(shopSizes as unknown as [string, ...string[]]) as unknown as z.ZodType<ShopSize>,
  shape: z.enum(shopShapes as unknown as [string, ...string[]]) as unknown as z.ZodType<ShopShape>,
  handle: z.enum(shopHandles as unknown as [string, ...string[]]) as unknown as z.ZodType<ShopHandle>,
  materials: z
    .array(z.enum(shopMaterials as unknown as [string, ...string[]]) as unknown as z.ZodType<ShopMaterial>)
    .min(1, "Pick at least one material."),
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
    size: row.size as ShopSize,
    shape: row.shape as ShopShape,
    handle: row.handleType as ShopHandle,
    tags: row.tags,
    soldOut: row.soldOut,
    isActive: row.isActive
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
    size: formData.get("size"),
    shape: formData.get("shape"),
    handle: formData.get("handle"),
    materials: formData.getAll("materials").map(String),
    tags: formData.getAll("tags").map(String)
  });

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
      materials: parsed.materials,
      size: parsed.size,
      shape: parsed.shape,
      handleType: parsed.handle,
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
  if (formData.has("size")) raw.size = formData.get("size");
  if (formData.has("shape")) raw.shape = formData.get("shape");
  if (formData.has("handle")) raw.handle = formData.get("handle");
  if (formData.getAll("materials").length) raw.materials = formData.getAll("materials").map(String);
  if (formData.getAll("tags").length) raw.tags = formData.getAll("tags").map(String);

  const parsed = shopProductUpdateSchema.parse(raw);

  const imageFiles = collectImageFiles(formData);
  const images = imageFiles.length ? await uploadImages(slug, imageFiles) : undefined;

  const [row] = await db
    .update(products)
    .set({
      ...(parsed.name !== undefined ? {name: parsed.name} : {}),
      ...(parsed.priceIdr !== undefined ? {priceIdr: parsed.priceIdr} : {}),
      ...(parsed.description !== undefined ? {description: parsed.description} : {}),
      ...(parsed.productType !== undefined ? {productType: parsed.productType} : {}),
      ...(parsed.size !== undefined ? {size: parsed.size} : {}),
      ...(parsed.shape !== undefined ? {shape: parsed.shape} : {}),
      ...(parsed.handle !== undefined ? {handleType: parsed.handle} : {}),
      ...(parsed.materials !== undefined ? {materials: parsed.materials} : {}),
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
