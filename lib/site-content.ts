import {eq} from "drizzle-orm";
import {db, siteContent} from "@/lib/db";

// The "Anita Yan" card that follows the cursor on the laptop home page. Everything on it can be
// edited in the admin panel; these are what shows until something is saved.
export type DesignerCard = {
  name: string;
  roleEn: string;
  roleId: string;
  aboutEn: string;
  aboutId: string;
  // Empty means the default portrait.
  photoUrl: string;
};

export const DEFAULT_DESIGNER_CARD: DesignerCard = {
  name: "Anita Yan",
  roleEn: "Founder & Designer",
  roleId: "Pendiri & Perancang",
  aboutEn: "Founded Natlovers in Yogyakarta in 1998 and leads the design of every collection.",
  aboutId: "Mendirikan Natlovers di Yogyakarta pada 1998 dan memimpin perancangan setiap koleksi.",
  photoUrl: ""
};

const KEY = "designer";

function clean(value: unknown, fallback: string, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

export async function getDesignerCard(): Promise<DesignerCard> {
  const [row] = await db.select().from(siteContent).where(eq(siteContent.key, KEY)).limit(1);
  const saved = (row?.value ?? {}) as Partial<DesignerCard>;
  return {
    name: clean(saved.name, DEFAULT_DESIGNER_CARD.name, 60),
    roleEn: clean(saved.roleEn, DEFAULT_DESIGNER_CARD.roleEn, 60),
    roleId: clean(saved.roleId, DEFAULT_DESIGNER_CARD.roleId, 60),
    aboutEn: clean(saved.aboutEn, DEFAULT_DESIGNER_CARD.aboutEn, 240),
    aboutId: clean(saved.aboutId, DEFAULT_DESIGNER_CARD.aboutId, 240),
    photoUrl: typeof saved.photoUrl === "string" ? saved.photoUrl : ""
  };
}

export async function saveDesignerCard(card: DesignerCard, adminEmail: string): Promise<DesignerCard> {
  const value = {
    name: clean(card.name, DEFAULT_DESIGNER_CARD.name, 60),
    roleEn: clean(card.roleEn, DEFAULT_DESIGNER_CARD.roleEn, 60),
    roleId: clean(card.roleId, DEFAULT_DESIGNER_CARD.roleId, 60),
    aboutEn: clean(card.aboutEn, DEFAULT_DESIGNER_CARD.aboutEn, 240),
    aboutId: clean(card.aboutId, DEFAULT_DESIGNER_CARD.aboutId, 240),
    photoUrl: card.photoUrl ?? ""
  };
  await db
    .insert(siteContent)
    .values({key: KEY, value, updatedByEmail: adminEmail, updatedAt: new Date()})
    .onConflictDoUpdate({target: siteContent.key, set: {value, updatedByEmail: adminEmail, updatedAt: new Date()}});
  return getDesignerCard();
}
