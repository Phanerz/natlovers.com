import {asc, desc, eq, gt, lt, max} from "drizzle-orm";
import {z} from "zod";
import {uploadFile} from "@/lib/blob";
import {db, heroCards} from "@/lib/db";

const IMAGE_PREFIX = "hero-cards";

export type HeroCardType = "color" | "image" | "testimony";

export type PublicHeroCard = {
  id: string;
  cardType: HeroCardType;
  colorValue: string | null;
  imageUrl: string | null;
  textContent: string | null;
};

export type AdminHeroCard = PublicHeroCard & {
  displayOrder: number;
};

const hexColor = /^#[0-9a-fA-F]{6}$/;

const createSchema = z.object({
  cardType: z.enum(["color", "image", "testimony"]),
  colorValue: z.string().regex(hexColor, "Color must be a hex value like #A1B2C3.").optional(),
  textContent: z.string().trim().min(1).optional()
});

function toPublicCard(row: typeof heroCards.$inferSelect): PublicHeroCard {
  return {
    id: row.id,
    cardType: row.cardType as HeroCardType,
    colorValue: row.colorValue,
    imageUrl: row.imageUrl,
    textContent: row.textContent
  };
}

function toAdminCard(row: typeof heroCards.$inferSelect): AdminHeroCard {
  return {...toPublicCard(row), displayOrder: row.displayOrder};
}

async function uploadCardImage(file: File): Promise<string> {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  return uploadFile(`${IMAGE_PREFIX}/${crypto.randomUUID()}.${extension}`, file);
}

export async function getActiveHeroCards(): Promise<PublicHeroCard[]> {
  const rows = await db.select().from(heroCards).orderBy(asc(heroCards.displayOrder));
  return rows.map(toPublicCard);
}

export async function getAllHeroCardsForAdmin(): Promise<AdminHeroCard[]> {
  const rows = await db.select().from(heroCards).orderBy(asc(heroCards.displayOrder));
  return rows.map(toAdminCard);
}

export async function createHeroCard(formData: FormData): Promise<AdminHeroCard> {
  const parsed = createSchema.parse({
    cardType: formData.get("cardType"),
    colorValue: formData.get("colorValue") || undefined,
    textContent: formData.get("textContent") || undefined
  });

  let colorValue: string | null = null;
  let imageUrl: string | null = null;
  let textContent: string | null = null;

  if (parsed.cardType === "color") {
    if (!parsed.colorValue) {
      throw new Error("A color value is required.");
    }
    colorValue = parsed.colorValue;
  } else if (parsed.cardType === "image") {
    const image = formData.get("image");
    if (!(image instanceof File) || image.size === 0) {
      throw new Error("An image is required.");
    }
    imageUrl = await uploadCardImage(image);
  } else {
    if (!parsed.textContent) {
      throw new Error("Text content is required.");
    }
    textContent = parsed.textContent;
  }

  const [{maxOrder}] = await db.select({maxOrder: max(heroCards.displayOrder)}).from(heroCards);
  const displayOrder = (maxOrder ?? -1) + 1;

  const [row] = await db
    .insert(heroCards)
    .values({cardType: parsed.cardType, colorValue, imageUrl, textContent, displayOrder})
    .returning();

  return toAdminCard(row);
}

export async function deleteHeroCard(id: string): Promise<void> {
  await db.delete(heroCards).where(eq(heroCards.id, id));
}

export async function reorderHeroCard(id: string, direction: "up" | "down"): Promise<void> {
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(heroCards).where(eq(heroCards.id, id)).limit(1);
    if (!current) {
      throw new Error("Hero card not found.");
    }

    const [neighbor] =
      direction === "up"
        ? await tx
            .select()
            .from(heroCards)
            .where(lt(heroCards.displayOrder, current.displayOrder))
            .orderBy(desc(heroCards.displayOrder))
            .limit(1)
        : await tx
            .select()
            .from(heroCards)
            .where(gt(heroCards.displayOrder, current.displayOrder))
            .orderBy(asc(heroCards.displayOrder))
            .limit(1);

    if (!neighbor || neighbor.id === id) {
      return; // Already at the boundary — nothing to swap with.
    }

    await tx.update(heroCards).set({displayOrder: neighbor.displayOrder}).where(eq(heroCards.id, id));
    await tx.update(heroCards).set({displayOrder: current.displayOrder}).where(eq(heroCards.id, neighbor.id));
  });
}
