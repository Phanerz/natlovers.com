import {eq} from "drizzle-orm";
import {z} from "zod";
import {db, users} from "@/lib/db";

export type AccountProfile = {
  name: string | null;
  email: string | null;
  image: string | null;
  phone: string | null;
  bio: string | null;
};

const updateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(500).optional()
});

function toProfile(row: typeof users.$inferSelect): AccountProfile {
  return {name: row.name, email: row.email, image: row.image, phone: row.phone, bio: row.bio};
}

export async function getAccountProfile(userId: string): Promise<AccountProfile | null> {
  const [row] = await db.select().from(users).where(eq(users.id, userId));
  return row ? toProfile(row) : null;
}

export async function updateAccountProfile(userId: string, body: unknown): Promise<AccountProfile> {
  const parsed = updateSchema.parse(body);

  const [row] = await db
    .update(users)
    .set({
      ...(parsed.name !== undefined ? {name: parsed.name} : {}),
      ...(parsed.phone !== undefined ? {phone: parsed.phone || null} : {}),
      ...(parsed.bio !== undefined ? {bio: parsed.bio || null} : {})
    })
    .where(eq(users.id, userId))
    .returning();

  if (!row) {
    throw new Error("Account not found.");
  }

  return toProfile(row);
}
