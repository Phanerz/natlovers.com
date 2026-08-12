import {and, asc, desc, eq, gt, lt, max} from "drizzle-orm";
import {z} from "zod";
import {uploadFile} from "@/lib/blob";
import {db, testimonialCards} from "@/lib/db";

const IMAGE_PREFIX = "testimonials";

export type CardType = "bag" | "testimony" | "bag_with_customer";

export type PublicTestimonialCard = {
  id: string;
  groupId: string;
  position: number;
  cardType: CardType;
  imageUrl: string | null;
  testimonyText: string | null;
  customerName: string | null;
};

export type AdminTestimonialCard = PublicTestimonialCard;

export type AdminTestimonialGroup = {
  groupId: string;
  displayOrder: number;
  isActive: boolean;
  cards: AdminTestimonialCard[];
};

const createSchema = z.object({
  testimonyText: z.string().trim().min(2, "Testimony text is required."),
  customerName: z.string().trim().min(1, "Customer name is required.")
});

const updateSchema = createSchema.partial();

function toPublicCard(row: typeof testimonialCards.$inferSelect): PublicTestimonialCard {
  return {
    id: row.id,
    groupId: row.groupId,
    position: row.position,
    cardType: row.cardType as CardType,
    imageUrl: row.imageUrl,
    testimonyText: row.testimonyText,
    customerName: row.customerName
  };
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uploadCardImage(groupId: string, position: number, file: File): Promise<string> {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  return uploadFile(`${IMAGE_PREFIX}/${groupId}-${position}-${Date.now()}.${extension}`, file);
}

export async function getActiveTestimonialCards(): Promise<PublicTestimonialCard[]> {
  const rows = await db
    .select()
    .from(testimonialCards)
    .where(eq(testimonialCards.isActive, true))
    .orderBy(asc(testimonialCards.displayOrder), asc(testimonialCards.position));
  return rows.map(toPublicCard);
}

export async function getAllGroupsForAdmin(): Promise<AdminTestimonialGroup[]> {
  const rows = await db
    .select()
    .from(testimonialCards)
    .orderBy(asc(testimonialCards.displayOrder), asc(testimonialCards.position));

  const groups = new Map<string, AdminTestimonialGroup>();
  for (const row of rows) {
    let group = groups.get(row.groupId);
    if (!group) {
      group = {groupId: row.groupId, displayOrder: row.displayOrder, isActive: row.isActive, cards: []};
      groups.set(row.groupId, group);
    }
    group.cards.push(toPublicCard(row));
  }
  return Array.from(groups.values());
}

export async function createTestimonialGroup(formData: FormData): Promise<AdminTestimonialGroup> {
  const parsed = createSchema.parse({
    testimonyText: formData.get("testimonyText"),
    customerName: formData.get("customerName")
  });

  const bagImage = formData.get("bagImage");
  const bagCustomerImage = formData.get("bagCustomerImage");
  if (!(bagImage instanceof File) || bagImage.size === 0) {
    throw new Error("Bag image is required.");
  }
  if (!(bagCustomerImage instanceof File) || bagCustomerImage.size === 0) {
    throw new Error("Bag + customer image is required.");
  }

  const groupId = `${slugify(parsed.customerName)}-${crypto.randomUUID().slice(0, 8)}`;

  const [{maxOrder}] = await db.select({maxOrder: max(testimonialCards.displayOrder)}).from(testimonialCards);
  const displayOrder = (maxOrder ?? -1) + 1;

  const [bagUrl, bagCustomerUrl] = await Promise.all([
    uploadCardImage(groupId, 1, bagImage),
    uploadCardImage(groupId, 3, bagCustomerImage)
  ]);

  const cards = await db
    .insert(testimonialCards)
    .values([
      {
        groupId,
        position: 1,
        cardType: "bag",
        imageUrl: bagUrl,
        testimonyText: null,
        customerName: null,
        displayOrder,
        isActive: true
      },
      {
        groupId,
        position: 2,
        cardType: "testimony",
        imageUrl: null,
        testimonyText: parsed.testimonyText,
        customerName: parsed.customerName,
        displayOrder,
        isActive: true
      },
      {
        groupId,
        position: 3,
        cardType: "bag_with_customer",
        imageUrl: bagCustomerUrl,
        testimonyText: null,
        customerName: null,
        displayOrder,
        isActive: true
      }
    ])
    .returning();

  return {groupId, displayOrder, isActive: true, cards: cards.map(toPublicCard)};
}

export async function updateTestimonialGroup(groupId: string, formData: FormData): Promise<AdminTestimonialGroup> {
  const existing = await db.select().from(testimonialCards).where(eq(testimonialCards.groupId, groupId));
  if (!existing.length) {
    throw new Error("Testimonial group not found.");
  }

  const raw: Record<string, unknown> = {};
  if (formData.has("testimonyText")) raw.testimonyText = formData.get("testimonyText");
  if (formData.has("customerName")) raw.customerName = formData.get("customerName");
  const parsed = updateSchema.parse(raw);

  if (parsed.testimonyText !== undefined || parsed.customerName !== undefined) {
    await db
      .update(testimonialCards)
      .set({
        ...(parsed.testimonyText !== undefined ? {testimonyText: parsed.testimonyText} : {}),
        ...(parsed.customerName !== undefined ? {customerName: parsed.customerName} : {}),
        updatedAt: new Date()
      })
      .where(and(eq(testimonialCards.groupId, groupId), eq(testimonialCards.position, 2)));
  }

  const bagImage = formData.get("bagImage");
  if (bagImage instanceof File && bagImage.size > 0) {
    const url = await uploadCardImage(groupId, 1, bagImage);
    await db
      .update(testimonialCards)
      .set({imageUrl: url, updatedAt: new Date()})
      .where(and(eq(testimonialCards.groupId, groupId), eq(testimonialCards.position, 1)));
  }

  const bagCustomerImage = formData.get("bagCustomerImage");
  if (bagCustomerImage instanceof File && bagCustomerImage.size > 0) {
    const url = await uploadCardImage(groupId, 3, bagCustomerImage);
    await db
      .update(testimonialCards)
      .set({imageUrl: url, updatedAt: new Date()})
      .where(and(eq(testimonialCards.groupId, groupId), eq(testimonialCards.position, 3)));
  }

  const rows = await db
    .select()
    .from(testimonialCards)
    .where(eq(testimonialCards.groupId, groupId))
    .orderBy(asc(testimonialCards.position));

  return {groupId, displayOrder: rows[0].displayOrder, isActive: rows[0].isActive, cards: rows.map(toPublicCard)};
}

export async function setTestimonialGroupActive(groupId: string, isActive: boolean): Promise<AdminTestimonialGroup> {
  const rows = await db
    .update(testimonialCards)
    .set({isActive, updatedAt: new Date()})
    .where(eq(testimonialCards.groupId, groupId))
    .returning();
  if (!rows.length) {
    throw new Error("Testimonial group not found.");
  }
  return {groupId, displayOrder: rows[0].displayOrder, isActive, cards: rows.map(toPublicCard)};
}

export async function reorderTestimonialGroup(groupId: string, direction: "up" | "down"): Promise<void> {
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(testimonialCards).where(eq(testimonialCards.groupId, groupId)).limit(1);
    if (!current) {
      throw new Error("Testimonial group not found.");
    }

    const [neighbor] =
      direction === "up"
        ? await tx
            .select()
            .from(testimonialCards)
            .where(lt(testimonialCards.displayOrder, current.displayOrder))
            .orderBy(desc(testimonialCards.displayOrder))
            .limit(1)
        : await tx
            .select()
            .from(testimonialCards)
            .where(gt(testimonialCards.displayOrder, current.displayOrder))
            .orderBy(asc(testimonialCards.displayOrder))
            .limit(1);

    if (!neighbor || neighbor.groupId === groupId) {
      return; // Already at the boundary — nothing to swap with.
    }

    await tx
      .update(testimonialCards)
      .set({displayOrder: neighbor.displayOrder, updatedAt: new Date()})
      .where(eq(testimonialCards.groupId, groupId));
    await tx
      .update(testimonialCards)
      .set({displayOrder: current.displayOrder, updatedAt: new Date()})
      .where(eq(testimonialCards.groupId, neighbor.groupId));
  });
}

export async function deleteTestimonialGroup(groupId: string): Promise<void> {
  await db.delete(testimonialCards).where(eq(testimonialCards.groupId, groupId));
}
