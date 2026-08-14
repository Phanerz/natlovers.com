import {asc, eq, inArray, max} from "drizzle-orm";
import {z} from "zod";
import {uploadFile} from "@/lib/blob";
import {db, heroCards} from "@/lib/db";

const IMAGE_PREFIX = "hero-cards";

export type HeroCardType = "color" | "image";

export type PublicHeroCard = {
  id: string;
  cardType: HeroCardType;
  colorValue: string | null;
  imageUrl: string | null;
};

export type AdminHeroCard = PublicHeroCard & {
  displayOrder: number;
};

const hexColor = /^#[0-9a-fA-F]{6}$/;

const createSchema = z.object({
  cardType: z.enum(["color", "image"]),
  colorValue: z.string().regex(hexColor, "Color must be a hex value like #A1B2C3.").optional()
});

function toPublicCard(row: typeof heroCards.$inferSelect): PublicHeroCard {
  return {
    id: row.id,
    cardType: row.cardType as HeroCardType,
    colorValue: row.colorValue,
    imageUrl: row.imageUrl
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
    colorValue: formData.get("colorValue") || undefined
  });

  let colorValue: string | null = null;
  let imageUrl: string | null = null;

  if (parsed.cardType === "color") {
    if (!parsed.colorValue) {
      throw new Error("A color value is required.");
    }
    colorValue = parsed.colorValue;
  } else {
    const image = formData.get("image");
    if (!(image instanceof File) || image.size === 0) {
      throw new Error("An image is required.");
    }
    imageUrl = await uploadCardImage(image);
  }

  const [{maxOrder}] = await db.select({maxOrder: max(heroCards.displayOrder)}).from(heroCards);
  const displayOrder = (maxOrder ?? -1) + 1;

  const [row] = await db
    .insert(heroCards)
    .values({cardType: parsed.cardType, colorValue, imageUrl, displayOrder})
    .returning();

  return toAdminCard(row);
}

export async function deleteHeroCard(id: string): Promise<void> {
  await db.delete(heroCards).where(eq(heroCards.id, id));
}

// Takes the full ordered list of ids (as dropped) and writes each one's
// index straight to displayOrder — replaces the old up/down swap-with-
// neighbor approach now that the panel does free drag-and-drop reordering
// instead of single-step moves.
export async function reorderAllHeroCards(orderedIds: string[]): Promise<void> {
  const existing = await db.select({id: heroCards.id}).from(heroCards).where(inArray(heroCards.id, orderedIds));
  if (existing.length !== orderedIds.length) {
    throw new Error("Hero card list is out of date — refresh and try again.");
  }

  await db.transaction(async (tx) => {
    await Promise.all(orderedIds.map((id, index) => tx.update(heroCards).set({displayOrder: index}).where(eq(heroCards.id, id))));
  });
}
