import {eq} from "drizzle-orm";
import {db, siteContent} from "@/lib/db";
import {DEFAULT_CONTACT, isPlausibleEmail, isPlausibleNumber, type ContactSettings, type WhatsAppContact} from "@/lib/studio-contact";

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

// Contact details (email and two WhatsApp numbers), editable in the admin panel so they can be
// changed when someone new looks after the shop. Stored in the same site_content table.
const CONTACT_KEY = "contact";

function sanitiseContact(raw: Partial<ContactSettings> | null | undefined): ContactSettings {
  const saved = raw ?? {};
  const email = typeof saved.email === "string" ? saved.email.trim().slice(0, 120) : "";
  const numbers = Array.isArray(saved.whatsapp) ? saved.whatsapp : [];
  const pick = (index: 0 | 1): WhatsAppContact => {
    const entry = numbers[index] as Partial<WhatsAppContact> | undefined;
    const number = typeof entry?.number === "string" ? entry.number.trim().slice(0, 30) : "";
    if (!number || !isPlausibleNumber(number)) return DEFAULT_CONTACT.whatsapp[index];
    return {name: clean(entry?.name, DEFAULT_CONTACT.whatsapp[index].name, 40), number};
  };
  return {
    email: email && isPlausibleEmail(email) ? email : DEFAULT_CONTACT.email,
    whatsapp: [pick(0), pick(1)]
  };
}

export async function getContactSettings(): Promise<ContactSettings> {
  try {
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, CONTACT_KEY)).limit(1);
    return sanitiseContact(row?.value as Partial<ContactSettings> | undefined);
  } catch (error) {
    // The pages that show contact details must still work if the database is unreachable.
    console.error("Failed to read the contact details:", error);
    return DEFAULT_CONTACT;
  }
}

// Throws a readable message if something is not valid, so the admin sees what to fix.
export async function saveContactSettings(input: ContactSettings, adminEmail: string): Promise<ContactSettings> {
  const email = String(input.email ?? "").trim();
  if (!isPlausibleEmail(email)) throw new Error("Enter a valid email address.");
  const whatsapp = (input.whatsapp ?? []).slice(0, 2).map((entry, index) => {
    const number = String(entry?.number ?? "").trim();
    if (!isPlausibleNumber(number)) throw new Error(`WhatsApp number ${index + 1} needs a country code, for example +62 812-0000-0000.`);
    const name = String(entry?.name ?? "").trim();
    if (!name) throw new Error(`Add a name for WhatsApp number ${index + 1}.`);
    return {name: name.slice(0, 40), number: number.slice(0, 30)};
  });
  if (whatsapp.length !== 2) throw new Error("Both WhatsApp numbers are needed.");
  const value = {email: email.slice(0, 120), whatsapp};
  await db
    .insert(siteContent)
    .values({key: CONTACT_KEY, value, updatedByEmail: adminEmail, updatedAt: new Date()})
    .onConflictDoUpdate({target: siteContent.key, set: {value, updatedByEmail: adminEmail, updatedAt: new Date()}});
  return getContactSettings();
}
