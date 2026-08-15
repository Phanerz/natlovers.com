import {eq} from "drizzle-orm";
import {z} from "zod";
import {db, users} from "@/lib/db";
import {WidgetKey, sanitizeWidgetKeys} from "@/lib/admin-widgets";

export type AccountProfile = {
  name: string | null;
  email: string | null;
  image: string | null;
  phone: string | null;
  bio: string | null;
  // Raw column value, not yet sanitized against the current widget catalog
  // — always null for non-admin accounts, since the picker UI that would
  // ever write this is admin-gated. Callers that render widgets should run
  // this through sanitizeWidgetKeys rather than trusting it directly, in
  // case the catalog has changed since it was saved.
  adminWidgets: string[] | null;
};

const updateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(500).optional()
});

function toProfile(row: typeof users.$inferSelect): AccountProfile {
  return {name: row.name, email: row.email, image: row.image, phone: row.phone, bio: row.bio, adminWidgets: row.adminWidgets};
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

// Called only from a route that has already verified the caller is an
// admin — this function itself doesn't re-check, since that gate belongs
// at the auth/session layer, not buried in a data-access helper.
export async function updateAdminWidgets(userId: string, widgetKeys: unknown): Promise<WidgetKey[]> {
  const sanitized = sanitizeWidgetKeys(widgetKeys);
  await db.update(users).set({adminWidgets: sanitized}).where(eq(users.id, userId));
  return sanitized;
}
