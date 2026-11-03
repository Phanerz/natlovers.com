import {asc, eq, inArray, max} from "drizzle-orm";
import {z} from "zod";
import {shopProductTypes, type ShopProductType} from "@/app/catalogue/shop-data";
import {
  AdminBanner,
  PublicBanner,
  bannerOverlays,
  desktopSpans,
  isSafeBannerDestination,
  mobileSpans
} from "@/lib/catalogue-banners";
import {uploadFile} from "@/lib/blob";
import {catalogueBanners, db} from "@/lib/db";
import {MAX_IMAGE_BYTES} from "@/lib/upload-limits";

const IMAGE_PREFIX = "catalogue-banners";
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Row = typeof catalogueBanners.$inferSelect;

function toPublic(row: Row): PublicBanner {
  return {
    id: row.id,
    eyebrow: row.eyebrow,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    ctaLabel: row.ctaLabel,
    destinationUrl: row.destinationUrl,
    category: (row.category as ShopProductType | null) ?? null,
    insertAfter: row.insertAfter,
    desktopSpan: row.desktopSpan as PublicBanner["desktopSpan"],
    mobileSpan: row.mobileSpan as PublicBanner["mobileSpan"],
    overlay: row.overlay as PublicBanner["overlay"]
  };
}

function toAdmin(row: Row): AdminBanner {
  return {...toPublic(row), isActive: row.isActive, displayOrder: row.displayOrder};
}

// Text fields: trimmed, and an empty string means "none".
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .transform((value) => (value === "" ? null : value));

const bannerSchema = z.object({
  eyebrow: optionalText(48, "The small label"),
  title: z.string().trim().min(1, "A title is required.").max(80, "The title must be 80 characters or fewer."),
  description: optionalText(240, "The description"),
  ctaLabel: optionalText(30, "The button label"),
  destinationUrl: optionalText(500, "The destination").refine(
    (value) => value === null || isSafeBannerDestination(value),
    "The destination must be a path on this site (starting with /) or an https:// link."
  ),
  isActive: z.boolean(),
  category: z.enum(shopProductTypes as unknown as [string, ...string[]]).nullable(),
  insertAfter: z.coerce.number().int("Insert after must be a whole number.").min(0).max(500),
  desktopSpan: z.enum(desktopSpans),
  mobileSpan: z.enum(mobileSpans),
  overlay: z.enum(bannerOverlays)
});

function parseFields(formData: FormData) {
  const category = String(formData.get("category") ?? "").trim();
  const parsed = bannerSchema.safeParse({
    eyebrow: String(formData.get("eyebrow") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    ctaLabel: String(formData.get("ctaLabel") ?? ""),
    destinationUrl: String(formData.get("destinationUrl") ?? ""),
    isActive: formData.get("isActive") !== "false",
    category: category === "" ? null : category,
    insertAfter: formData.get("insertAfter") ?? 6,
    desktopSpan: formData.get("desktopSpan") ?? "2x1",
    mobileSpan: formData.get("mobileSpan") ?? "full",
    overlay: formData.get("overlay") ?? "dark"
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid banner.");
  }
  // A button needs somewhere to go, and somewhere to go needs a label.
  if (parsed.data.ctaLabel && !parsed.data.destinationUrl) {
    throw new Error("A button label needs a destination.");
  }
  return parsed.data;
}

async function uploadBannerImage(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("The banner image must be a JPG, PNG or WEBP file.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("The banner image is too large.");
  }
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  return uploadFile(`${IMAGE_PREFIX}/${crypto.randomUUID()}.${extension}`, file);
}

function readImage(formData: FormData): File | null {
  const image = formData.get("image");
  return image instanceof File && image.size > 0 ? image : null;
}

// Public: only banners that are switched on, in display order.
export async function getActiveBanners(): Promise<PublicBanner[]> {
  const rows = await db
    .select()
    .from(catalogueBanners)
    .where(eq(catalogueBanners.isActive, true))
    .orderBy(asc(catalogueBanners.displayOrder));
  return rows.map(toPublic);
}

export async function getAllBannersForAdmin(): Promise<AdminBanner[]> {
  const rows = await db.select().from(catalogueBanners).orderBy(asc(catalogueBanners.displayOrder));
  return rows.map(toAdmin);
}

export async function createBanner(formData: FormData): Promise<AdminBanner> {
  const fields = parseFields(formData);
  const image = readImage(formData);
  if (!image) {
    throw new Error("A banner image is required.");
  }
  const imageUrl = await uploadBannerImage(image);

  const [{maxOrder}] = await db.select({maxOrder: max(catalogueBanners.displayOrder)}).from(catalogueBanners);
  const [row] = await db
    .insert(catalogueBanners)
    .values({...fields, imageUrl, displayOrder: (maxOrder ?? -1) + 1})
    .returning();
  return toAdmin(row);
}

export async function updateBanner(id: string, formData: FormData): Promise<AdminBanner> {
  const [existing] = await db.select().from(catalogueBanners).where(eq(catalogueBanners.id, id));
  if (!existing) {
    throw new Error("Banner not found.");
  }
  const fields = parseFields(formData);
  const image = readImage(formData);
  const imageUrl = image ? await uploadBannerImage(image) : existing.imageUrl;

  const [row] = await db
    .update(catalogueBanners)
    .set({...fields, imageUrl, updatedAt: new Date()})
    .where(eq(catalogueBanners.id, id))
    .returning();
  return toAdmin(row);
}

export async function setBannerActive(id: string, isActive: boolean): Promise<void> {
  await db.update(catalogueBanners).set({isActive, updatedAt: new Date()}).where(eq(catalogueBanners.id, id));
}

export async function deleteBanner(id: string): Promise<void> {
  await db.delete(catalogueBanners).where(eq(catalogueBanners.id, id));
}

export async function reorderBanners(orderedIds: string[]): Promise<void> {
  const existing = await db.select({id: catalogueBanners.id}).from(catalogueBanners).where(inArray(catalogueBanners.id, orderedIds));
  if (existing.length !== orderedIds.length) {
    throw new Error("The banner list is out of date. Refresh and try again.");
  }
  await db.transaction(async (tx) => {
    await Promise.all(
      orderedIds.map((id, index) => tx.update(catalogueBanners).set({displayOrder: index}).where(eq(catalogueBanners.id, id)))
    );
  });
}
