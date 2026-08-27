import {and, asc, count, desc, eq, inArray, isNotNull, min} from "drizzle-orm";
import {z} from "zod";
import {customRequestImages, customRequests, db, products, users} from "@/lib/db";
import {
  customConfigSchema,
  customProductTypes,
  customRequestStatusSchema,
  isCustomProductType,
  MAX_NOTES,
  openCustomRequestStatuses,
  type CustomConfig,
  type CustomProductType,
  type CustomRequestStatus
} from "@/lib/custom-studio";
import {calculateEstimate, emptyPricingBasis, type PricingBasis} from "@/lib/custom-pricing";
import {emptyPreviewCatalogue, type PreviewCatalogue, type PreviewProduct} from "@/lib/custom-preview";
import {currencies, type CurrencyCode} from "@/lib/site";

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export type CustomRequestImageView = {
  id: string;
  url: string;
  storageKey: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type CustomRequestView = {
  id: string;
  requestRef: string | null;
  productType: CustomProductType;
  configuration: CustomConfig;
  estimatedPriceIdr: number;
  finalPriceIdr: number | null;
  currency: CurrencyCode;
  notes: string | null;
  status: CustomRequestStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: CustomRequestImageView[];
};

// The admin list/detail shape  -  a request plus who sent it. Customer
// identity is joined in rather than denormalised onto the request, since
// unlike an order (which snapshots its shipping address because that is a
// record of what physically happened) a custom request is an ongoing
// conversation and should always show the customer's current contact
// details.
export type AdminCustomRequestView = CustomRequestView & {
  adminNotes: string | null;
  customer: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    image: string | null;
  };
};

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

const currencySchema = z.enum(currencies as unknown as [CurrencyCode, ...CurrencyCode[]]);

// A stored configuration is validated on the way back out, not just on the
// way in. The column is jsonb, so a row written by an older version of the
// schema (or by hand during support) could be any shape at all  -  parsing on
// read means a malformed row degrades to "unreadable configuration" in one
// place instead of throwing somewhere deep in a render.
function parseConfiguration(raw: unknown, productType: string): CustomConfig | null {
  const parsed = customConfigSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  console.error(`custom_requests: unreadable ${productType} configuration`, parsed.error.flatten());
  return null;
}

function toStatus(raw: string): CustomRequestStatus {
  const parsed = customRequestStatusSchema.safeParse(raw);
  return parsed.success ? parsed.data : "submitted";
}

function toCurrency(raw: string): CurrencyCode {
  const parsed = currencySchema.safeParse(raw);
  return parsed.success ? parsed.data : "IDR";
}

// Distinct from orders' NAT- prefix so a customer reading a reference aloud
// to the studio can't have a commission confused with a shop order.
function generateRequestRef(): string {
  return `CS-${Date.now().toString().slice(-8)}`;
}

// ---------------------------------------------------------------------------
// Catalogue-derived inputs (pricing basis + preview imagery)
// ---------------------------------------------------------------------------

// The lowest active catalogue price per product type, in IDR. This is what
// anchors every estimate  -  see lib/custom-pricing.ts for why no base price
// is written down in code. A type with no active products yields null and
// the studio quotes those requests by hand.
export async function getPricingBasis(): Promise<PricingBasis> {
  const rows = await db
    .select({productType: products.productType, lowest: min(products.priceIdr)})
    .from(products)
    .where(eq(products.isActive, true))
    .groupBy(products.productType);

  const basis: PricingBasis = {...emptyPricingBasis};

  for (const row of rows) {
    if (isCustomProductType(row.productType) && row.lowest !== null) {
      basis[row.productType] = Number(row.lowest);
    }
  }

  return basis;
}

// Real photographed products the live preview can draw on, grouped by type.
// Only active products with at least one image qualify  -  a product with no
// photograph cannot illustrate anything, and including it would only let the
// matcher pick a candidate it then can't render.
export async function getPreviewCatalogue(): Promise<PreviewCatalogue> {
  const rows = await db
    .select({
      slug: products.slug,
      name: products.name,
      images: products.images,
      productType: products.productType,
      shape: products.shape,
      handleType: products.handleType,
      materials: products.materials,
      size: products.size
    })
    .from(products)
    .where(and(eq(products.isActive, true), inArray(products.productType, [...customProductTypes])))
    .orderBy(asc(products.name));

  const catalogue: PreviewCatalogue = {Bags: [], Dolls: [], Apparels: []};

  for (const row of rows) {
    if (!isCustomProductType(row.productType) || !row.images.length) {
      continue;
    }
    const product: PreviewProduct = {
      slug: row.slug,
      name: row.name,
      images: row.images,
      productType: row.productType,
      shape: row.shape,
      handleType: row.handleType,
      materials: row.materials,
      size: row.size
    };
    catalogue[row.productType].push(product);
  }

  return catalogue;
}

export async function getStudioCatalogueData(): Promise<{basis: PricingBasis; catalogue: PreviewCatalogue}> {
  const [basis, catalogue] = await Promise.all([getPricingBasis(), getPreviewCatalogue()]);
  return {basis, catalogue};
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

type RequestRow = typeof customRequests.$inferSelect;

async function imagesFor(requestIds: string[]): Promise<Map<string, CustomRequestImageView[]>> {
  const map = new Map<string, CustomRequestImageView[]>();
  if (!requestIds.length) {
    return map;
  }

  const rows = await db
    .select()
    .from(customRequestImages)
    .where(inArray(customRequestImages.customRequestId, requestIds))
    .orderBy(asc(customRequestImages.sortOrder), asc(customRequestImages.createdAt));

  for (const row of rows) {
    const list = map.get(row.customRequestId) ?? [];
    list.push({
      id: row.id,
      url: row.url,
      storageKey: row.storageKey,
      sortOrder: row.sortOrder,
      isPrimary: row.isPrimary
    });
    map.set(row.customRequestId, list);
  }

  return map;
}

function toView(row: RequestRow, images: CustomRequestImageView[]): CustomRequestView | null {
  if (!isCustomProductType(row.productType)) {
    return null;
  }
  const configuration = parseConfiguration(row.configuration, row.productType);
  if (!configuration) {
    return null;
  }

  return {
    id: row.id,
    requestRef: row.requestRef,
    productType: row.productType,
    configuration,
    estimatedPriceIdr: row.estimatedPriceIdr,
    finalPriceIdr: row.finalPriceIdr,
    currency: toCurrency(row.currency),
    notes: row.notes,
    status: toStatus(row.status),
    submittedAt: row.submittedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    images
  };
}

// ---------------------------------------------------------------------------
// Customer-facing writes
// ---------------------------------------------------------------------------

export const draftInputSchema = z.object({
  configuration: customConfigSchema,
  notes: z.string().trim().max(MAX_NOTES).optional().default(""),
  currency: currencySchema.optional().default("IDR")
});

export type DraftInput = z.infer<typeof draftInputSchema>;

// Recomputed server-side from the submitted configuration rather than
// trusted from the client, exactly as createOrder recomputes an order total
// from live catalogue prices  -  a price the browser sends is a price the
// browser can edit.
async function priceFor(configuration: CustomConfig): Promise<number> {
  const basis = await getPricingBasis();
  const estimate = calculateEstimate(configuration, basis);
  return estimate?.totalIdr ?? 0;
}

// Upserts the customer's single open draft. The partial unique index on
// (user_id) where status='draft' is what makes this safe under two tabs
// saving at once: the second insert conflicts and updates instead of
// creating a rival draft.
export async function saveDraft(userId: string, input: DraftInput): Promise<CustomRequestView | null> {
  const estimatedPriceIdr = await priceFor(input.configuration);

  const [existing] = await db
    .select({id: customRequests.id})
    .from(customRequests)
    .where(and(eq(customRequests.userId, userId), eq(customRequests.status, "draft")))
    .limit(1);

  const values = {
    productType: input.configuration.productType,
    configuration: input.configuration,
    notes: input.notes || null,
    currency: input.currency,
    estimatedPriceIdr,
    updatedAt: new Date()
  };

  const [row] = existing
    ? await db.update(customRequests).set(values).where(eq(customRequests.id, existing.id)).returning()
    : await db
        .insert(customRequests)
        .values({userId, status: "draft", ...values})
        .returning();

  const images = await imagesFor([row.id]);
  return toView(row, images.get(row.id) ?? []);
}

export async function getDraft(userId: string): Promise<CustomRequestView | null> {
  const [row] = await db
    .select()
    .from(customRequests)
    .where(and(eq(customRequests.userId, userId), eq(customRequests.status, "draft")))
    .limit(1);

  if (!row) {
    return null;
  }

  const images = await imagesFor([row.id]);
  return toView(row, images.get(row.id) ?? []);
}

export async function discardDraft(userId: string): Promise<void> {
  await db.delete(customRequests).where(and(eq(customRequests.userId, userId), eq(customRequests.status, "draft")));
}

// Promotes the customer's draft to a real submission. Returns null when
// there is no draft to submit, which is what makes double-submits harmless:
// the second request finds the row already moved past 'draft' and reports
// the existing reference instead of creating a duplicate.
export async function submitDraft(userId: string, input: DraftInput): Promise<CustomRequestView | null> {
  const estimatedPriceIdr = await priceFor(input.configuration);
  const now = new Date();

  const [row] = await db
    .update(customRequests)
    .set({
      productType: input.configuration.productType,
      configuration: input.configuration,
      notes: input.notes || null,
      currency: input.currency,
      estimatedPriceIdr,
      status: "submitted",
      requestRef: generateRequestRef(),
      submittedAt: now,
      updatedAt: now
    })
    .where(and(eq(customRequests.userId, userId), eq(customRequests.status, "draft")))
    .returning();

  if (!row) {
    return null;
  }

  const images = await imagesFor([row.id]);
  return toView(row, images.get(row.id) ?? []);
}

// The customer's own history. Drafts are excluded  -  a draft is the studio
// page's saved state, not something the customer thinks of as a request
// they have made.
export async function getCustomerRequests(userId: string): Promise<CustomRequestView[]> {
  const rows = await db
    .select()
    .from(customRequests)
    .where(and(eq(customRequests.userId, userId), isNotNull(customRequests.requestRef)))
    .orderBy(desc(customRequests.submittedAt));

  const images = await imagesFor(rows.map((row) => row.id));

  return rows
    .map((row) => toView(row, images.get(row.id) ?? []))
    .filter((view): view is CustomRequestView => view !== null);
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

// Appends to whatever is already attached rather than replacing it, so a
// customer adding a second batch of photos does not silently lose the first.
export async function attachImages(
  requestId: string,
  uploads: {url: string; storageKey: string}[]
): Promise<CustomRequestImageView[]> {
  if (!uploads.length) {
    return [];
  }

  const [{value: existingCount}] = await db
    .select({value: count()})
    .from(customRequestImages)
    .where(eq(customRequestImages.customRequestId, requestId));

  await db.insert(customRequestImages).values(
    uploads.map((upload, index) => ({
      customRequestId: requestId,
      url: upload.url,
      storageKey: upload.storageKey,
      sortOrder: existingCount + index,
      isPrimary: existingCount + index === 0
    }))
  );

  const images = await imagesFor([requestId]);
  return images.get(requestId) ?? [];
}

// Scoped by userId so one customer can never remove another's image by
// guessing an id  -  ownership is checked in the query rather than by a
// separate read, so there is no window between the check and the delete.
export async function removeImage(userId: string, requestId: string, imageId: string): Promise<boolean> {
  const [owned] = await db
    .select({id: customRequests.id})
    .from(customRequests)
    .where(and(eq(customRequests.id, requestId), eq(customRequests.userId, userId)))
    .limit(1);

  if (!owned) {
    return false;
  }

  const deleted = await db
    .delete(customRequestImages)
    .where(and(eq(customRequestImages.id, imageId), eq(customRequestImages.customRequestId, requestId)))
    .returning({id: customRequestImages.id});

  return deleted.length > 0;
}

// ---------------------------------------------------------------------------
// Admin reads and writes
// ---------------------------------------------------------------------------

function withCustomer(
  row: RequestRow & {
    customerId: string;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    customerImage: string | null;
  },
  images: CustomRequestImageView[]
): AdminCustomRequestView | null {
  const base = toView(row, images);
  if (!base) {
    return null;
  }
  return {
    ...base,
    adminNotes: row.adminNotes,
    customer: {
      id: row.customerId,
      name: row.customerName,
      email: row.customerEmail,
      phone: row.customerPhone,
      image: row.customerImage
    }
  };
}

const adminSelect = {
  id: customRequests.id,
  requestRef: customRequests.requestRef,
  userId: customRequests.userId,
  productType: customRequests.productType,
  configuration: customRequests.configuration,
  estimatedPriceIdr: customRequests.estimatedPriceIdr,
  finalPriceIdr: customRequests.finalPriceIdr,
  currency: customRequests.currency,
  notes: customRequests.notes,
  status: customRequests.status,
  adminNotes: customRequests.adminNotes,
  submittedAt: customRequests.submittedAt,
  createdAt: customRequests.createdAt,
  updatedAt: customRequests.updatedAt,
  customerId: users.id,
  customerName: users.name,
  customerEmail: users.email,
  customerPhone: users.phone,
  customerImage: users.image
};

// Drafts never appear in the studio's queue. They are unfinished pages, not
// requests anyone has actually sent, and listing them would mean the studio
// seeing configurations a customer is still in the middle of choosing.
export async function listCustomRequests(status?: CustomRequestStatus): Promise<AdminCustomRequestView[]> {
  const rows = await db
    .select(adminSelect)
    .from(customRequests)
    .innerJoin(users, eq(users.id, customRequests.userId))
    .where(
      status
        ? and(eq(customRequests.status, status), isNotNull(customRequests.requestRef))
        : isNotNull(customRequests.requestRef)
    )
    .orderBy(desc(customRequests.submittedAt));

  const images = await imagesFor(rows.map((row) => row.id));

  return rows
    .map((row) => withCustomer(row as Parameters<typeof withCustomer>[0], images.get(row.id) ?? []))
    .filter((view): view is AdminCustomRequestView => view !== null);
}

export async function getCustomRequest(id: string): Promise<AdminCustomRequestView | null> {
  const [row] = await db
    .select(adminSelect)
    .from(customRequests)
    .innerJoin(users, eq(users.id, customRequests.userId))
    .where(eq(customRequests.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const images = await imagesFor([row.id]);
  return withCustomer(row as Parameters<typeof withCustomer>[0], images.get(row.id) ?? []);
}

export const adminUpdateSchema = z.object({
  status: customRequestStatusSchema.exclude(["draft"]).optional(),
  // Explicit null clears a quote; undefined leaves it untouched. Without the
  // distinction there would be no way to undo a final price that was set by
  // mistake.
  finalPriceIdr: z.number().int().min(0).nullable().optional(),
  adminNotes: z.string().trim().max(4000).nullable().optional()
});

export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;

export async function updateCustomRequest(id: string, input: AdminUpdateInput): Promise<AdminCustomRequestView | null> {
  const patch: Partial<typeof customRequests.$inferInsert> = {updatedAt: new Date()};

  if (input.status !== undefined) patch.status = input.status;
  if (input.finalPriceIdr !== undefined) patch.finalPriceIdr = input.finalPriceIdr;
  if (input.adminNotes !== undefined) patch.adminNotes = input.adminNotes || null;

  const [row] = await db.update(customRequests).set(patch).where(eq(customRequests.id, id)).returning({id: customRequests.id});

  if (!row) {
    return null;
  }

  return getCustomRequest(id);
}

// Feeds the dashboard's Needs Attention list. Counts only the statuses that
// are genuinely waiting on someone at the studio, so the number means
// "things to do" rather than "requests that exist".
export async function countOpenCustomRequests(): Promise<number> {
  const [row] = await db
    .select({value: count()})
    .from(customRequests)
    .where(inArray(customRequests.status, openCustomRequestStatuses));

  return row?.value ?? 0;
}

export async function countCustomRequestsByStatus(): Promise<Record<string, number>> {
  const rows = await db
    .select({status: customRequests.status, value: count()})
    .from(customRequests)
    .where(isNotNull(customRequests.requestRef))
    .groupBy(customRequests.status);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.status] = row.value;
  }
  return counts;
}

// Ensures a request belongs to the signed-in customer before anything is
// done to it. Used by the upload route, which otherwise would let any
// authenticated user attach photographs to a stranger's commission.
export async function assertOwnedRequest(userId: string, requestId: string): Promise<boolean> {
  const [row] = await db
    .select({id: customRequests.id})
    .from(customRequests)
    .where(and(eq(customRequests.id, requestId), eq(customRequests.userId, userId)))
    .limit(1);

  return Boolean(row);
}
