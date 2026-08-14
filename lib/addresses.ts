import {and, eq} from "drizzle-orm";
import {z} from "zod";
import {addresses, db} from "@/lib/db";

export type AddressView = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export const addressInputSchema = z.object({
  label: z.string().trim().min(1).default("Home"),
  recipientName: z.string().trim().min(2, "Recipient name is required."),
  phone: z.string().trim().min(6, "Phone number is required."),
  street: z.string().trim().min(4, "Street address is required."),
  city: z.string().trim().min(2, "City is required."),
  province: z.string().trim().optional(),
  postalCode: z.string().trim().min(2, "Postal code is required."),
  country: z.string().trim().min(2, "Country is required.")
});

export type AddressInput = z.infer<typeof addressInputSchema>;

function toAddressView(row: typeof addresses.$inferSelect): AddressView {
  return {
    id: row.id,
    label: row.label,
    recipientName: row.recipientName,
    phone: row.phone,
    street: row.street,
    city: row.city,
    province: row.province,
    postalCode: row.postalCode,
    country: row.country,
    isDefault: row.isDefault
  };
}

export async function getAddressesForUser(userId: string): Promise<AddressView[]> {
  const rows = await db.select().from(addresses).where(eq(addresses.userId, userId));
  // Default first, then most recently updated — the address someone's most
  // likely to want is either the one they always ship to or the one they
  // just touched.
  rows.sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
  return rows.map(toAddressView);
}

export async function getDefaultAddress(userId: string): Promise<AddressView | null> {
  const [row] = await db.select().from(addresses).where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));
  return row ? toAddressView(row) : null;
}

async function unsetOtherDefaults(userId: string, exceptId?: string) {
  const rows = await db.select({id: addresses.id}).from(addresses).where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));
  await Promise.all(
    rows.filter((row) => row.id !== exceptId).map((row) => db.update(addresses).set({isDefault: false}).where(eq(addresses.id, row.id)))
  );
}

export async function createAddress(userId: string, input: AddressInput, makeDefault = false): Promise<AddressView> {
  const existing = await db.select({id: addresses.id}).from(addresses).where(eq(addresses.userId, userId));
  // A customer's very first saved address is always the default — there's
  // no meaningful "not default" state when it's the only one they have.
  const isDefault = makeDefault || existing.length === 0;

  if (isDefault) {
    await unsetOtherDefaults(userId);
  }

  const [row] = await db
    .insert(addresses)
    .values({
      userId,
      label: input.label,
      recipientName: input.recipientName,
      phone: input.phone,
      street: input.street,
      city: input.city,
      province: input.province || null,
      postalCode: input.postalCode,
      country: input.country,
      isDefault
    })
    .returning();

  return toAddressView(row);
}

export async function updateAddress(userId: string, id: string, input: AddressInput, makeDefault?: boolean): Promise<AddressView | null> {
  const [existing] = await db.select().from(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  if (!existing) {
    return null;
  }

  if (makeDefault) {
    await unsetOtherDefaults(userId, id);
  }

  const [row] = await db
    .update(addresses)
    .set({
      label: input.label,
      recipientName: input.recipientName,
      phone: input.phone,
      street: input.street,
      city: input.city,
      province: input.province || null,
      postalCode: input.postalCode,
      country: input.country,
      ...(makeDefault !== undefined ? {isDefault: makeDefault} : {}),
      updatedAt: new Date()
    })
    .where(eq(addresses.id, id))
    .returning();

  return toAddressView(row);
}

// If the deleted address was the default and other addresses remain, the
// most recently updated one is promoted — there's always exactly one
// default whenever at least one address exists.
export async function deleteAddress(userId: string, id: string): Promise<boolean> {
  const [deleted] = await db
    .delete(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .returning({id: addresses.id, wasDefault: addresses.isDefault});

  if (!deleted) {
    return false;
  }

  if (deleted.wasDefault) {
    const remaining = await db.select({id: addresses.id}).from(addresses).where(eq(addresses.userId, userId));
    if (remaining.length) {
      await db.update(addresses).set({isDefault: true}).where(eq(addresses.id, remaining[0].id));
    }
  }

  return true;
}

export async function setDefaultAddress(userId: string, id: string): Promise<boolean> {
  const [existing] = await db.select({id: addresses.id}).from(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  if (!existing) {
    return false;
  }
  await unsetOtherDefaults(userId, id);
  await db.update(addresses).set({isDefault: true}).where(eq(addresses.id, id));
  return true;
}
