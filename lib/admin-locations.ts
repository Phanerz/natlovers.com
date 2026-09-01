import {asc, eq, sql} from "drizzle-orm";
import {z} from "zod";
import {db, locations} from "@/lib/db";
import {LocationIcon, LocationType} from "@/lib/location-constants";

export type AdminLocation = {
  id: string;
  name: string;
  type: LocationType;
  icon: LocationIcon;
  addressLine1: string;
  addressLine2: string | null;
  latitude: number;
  longitude: number;
  hoursDisplay: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const locationInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  type: z.enum(["main_studio", "stockist"]),
  icon: z.enum(["flower", "shopping_bag", "palette", "house", "basket"]),
  addressLine1: z.string().trim().min(1, "Address is required."),
  addressLine2: z.string().trim().max(200).optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  hoursDisplay: z.string().trim().max(120).optional(),
  isActive: z.coerce.boolean().optional()
});

const locationUpdateSchema = locationInputSchema.partial();

function toAdminLocation(row: typeof locations.$inferSelect): AdminLocation {
  return {
    id: row.id,
    name: row.name,
    type: row.type as LocationType,
    icon: row.icon as LocationIcon,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    latitude: row.latitude,
    longitude: row.longitude,
    hoursDisplay: row.hoursDisplay,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function getAllLocationsForAdmin(): Promise<AdminLocation[]> {
  const rows = await db.select().from(locations).orderBy(asc(locations.displayOrder));
  return rows.map(toAdminLocation);
}

export async function createLocation(formData: FormData): Promise<AdminLocation> {
  const parsed = locationInputSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    icon: formData.get("icon"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") || undefined,
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    hoursDisplay: formData.get("hoursDisplay") || undefined,
    isActive: formData.get("isActive") ?? undefined
  });

  // New locations go to the end of the list  -  the admin reorders with the
  // up/down controls afterward if it needs to sit somewhere else, same as
  // how a new hero card starts at the bottom of its own ordered list.
  const [{maxOrder}] = await db.select({maxOrder: sql<number>`coalesce(max(${locations.displayOrder}), -1)`}).from(locations);

  const [row] = await db
    .insert(locations)
    .values({
      name: parsed.name,
      type: parsed.type,
      icon: parsed.icon,
      addressLine1: parsed.addressLine1,
      addressLine2: parsed.addressLine2 ?? null,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      hoursDisplay: parsed.hoursDisplay ?? null,
      displayOrder: maxOrder + 1,
      isActive: parsed.isActive ?? true
    })
    .returning();

  return toAdminLocation(row);
}

export async function updateLocation(id: string, formData: FormData): Promise<AdminLocation> {
  const [existing] = await db.select().from(locations).where(eq(locations.id, id));
  if (!existing) {
    throw new Error("Location not found.");
  }

  const raw: Record<string, unknown> = {};
  if (formData.has("name")) raw.name = formData.get("name");
  if (formData.has("type")) raw.type = formData.get("type");
  if (formData.has("icon")) raw.icon = formData.get("icon");
  if (formData.has("addressLine1")) raw.addressLine1 = formData.get("addressLine1");
  if (formData.has("addressLine2")) raw.addressLine2 = formData.get("addressLine2") || undefined;
  if (formData.has("latitude")) raw.latitude = formData.get("latitude");
  if (formData.has("longitude")) raw.longitude = formData.get("longitude");
  if (formData.has("hoursDisplay")) raw.hoursDisplay = formData.get("hoursDisplay") || undefined;
  if (formData.has("isActive")) raw.isActive = formData.get("isActive");

  const parsed = locationUpdateSchema.parse(raw);

  const [row] = await db
    .update(locations)
    .set({
      ...(parsed.name !== undefined ? {name: parsed.name} : {}),
      ...(parsed.type !== undefined ? {type: parsed.type} : {}),
      ...(parsed.icon !== undefined ? {icon: parsed.icon} : {}),
      ...(parsed.addressLine1 !== undefined ? {addressLine1: parsed.addressLine1} : {}),
      ...(formData.has("addressLine2") ? {addressLine2: parsed.addressLine2 ?? null} : {}),
      ...(parsed.latitude !== undefined ? {latitude: parsed.latitude} : {}),
      ...(parsed.longitude !== undefined ? {longitude: parsed.longitude} : {}),
      ...(formData.has("hoursDisplay") ? {hoursDisplay: parsed.hoursDisplay ?? null} : {}),
      ...(parsed.isActive !== undefined ? {isActive: parsed.isActive} : {}),
      updatedAt: new Date()
    })
    .where(eq(locations.id, id))
    .returning();

  return toAdminLocation(row);
}

export async function setLocationActive(id: string, isActive: boolean): Promise<AdminLocation> {
  const [row] = await db.update(locations).set({isActive, updatedAt: new Date()}).where(eq(locations.id, id)).returning();
  if (!row) {
    throw new Error("Location not found.");
  }
  return toAdminLocation(row);
}

// Swaps this location's displayOrder with its neighbor in the given
// direction  -  the up/down control instead of drag-reorder, since
// drag-reorder's state-commit bug already bit the category pills earlier
// this session. Two locations can never share a displayOrder afterward
// because this only ever swaps two existing values.
export async function moveLocation(id: string, direction: "up" | "down"): Promise<AdminLocation[]> {
  const rows = await db.select().from(locations).orderBy(asc(locations.displayOrder));
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) {
    throw new Error("Location not found.");
  }
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= rows.length) {
    return rows.map(toAdminLocation);
  }

  const current = rows[index];
  const swapWith = rows[swapIndex];

  await db.transaction(async (tx) => {
    await tx.update(locations).set({displayOrder: swapWith.displayOrder, updatedAt: new Date()}).where(eq(locations.id, current.id));
    await tx.update(locations).set({displayOrder: current.displayOrder, updatedAt: new Date()}).where(eq(locations.id, swapWith.id));
  });

  const updated = await db.select().from(locations).orderBy(asc(locations.displayOrder));
  return updated.map(toAdminLocation);
}
