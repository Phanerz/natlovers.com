import {asc, eq} from "drizzle-orm";
import {z} from "zod";
import {db, bodyShapes} from "@/lib/db";
import type {BodyShapeType} from "@/lib/body-shapes";

export type AdminBodyShape = {
  id: string;
  name: string;
  shapeType: BodyShapeType;
  widthCm: number | null;
  widthBottomCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  diameterCm: number | null;
  thicknessCm: number | null;
  inStock: boolean;
  notes: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

// Every dimension is optional at the schema level (a body can be in the
// catalog with no measurement yet, e.g. "Palit lodong/bucket")  -  which
// fields actually matter is a UI nudge based on shapeType, not a hard
// server-side requirement, since the workshop's own real-world data isn't
// always complete.
const bodyShapeInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  shapeType: z.enum(["box", "round"]) as unknown as z.ZodType<BodyShapeType>,
  widthCm: z.coerce.number().nonnegative().optional(),
  widthBottomCm: z.coerce.number().nonnegative().optional(),
  heightCm: z.coerce.number().nonnegative().optional(),
  depthCm: z.coerce.number().nonnegative().optional(),
  diameterCm: z.coerce.number().nonnegative().optional(),
  thicknessCm: z.coerce.number().nonnegative().optional(),
  inStock: z.coerce.boolean().optional(),
  notes: z.string().trim().max(300).optional()
});

const bodyShapeUpdateSchema = bodyShapeInputSchema.partial();

function parseNumberField(formData: FormData, field: string): number | undefined {
  const raw = formData.get(field);
  if (raw === null || raw.toString().trim() === "") {
    return undefined;
  }
  return Number(raw);
}

function toAdminBodyShape(row: typeof bodyShapes.$inferSelect): AdminBodyShape {
  return {
    id: row.id,
    name: row.name,
    shapeType: row.shapeType as BodyShapeType,
    widthCm: row.widthCm,
    widthBottomCm: row.widthBottomCm,
    heightCm: row.heightCm,
    depthCm: row.depthCm,
    diameterCm: row.diameterCm,
    thicknessCm: row.thicknessCm,
    inStock: row.inStock,
    notes: row.notes,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function getAllBodyShapesForAdmin(): Promise<AdminBodyShape[]> {
  const rows = await db.select().from(bodyShapes).orderBy(asc(bodyShapes.name));
  return rows.map(toAdminBodyShape);
}

// Used to resolve a product's assigned body for display (storefront
// Dimensions accordion, admin product list/form)  -  returns null for
// bodyShapeId === null (unassigned) without hitting the database.
export async function getBodyShapeById(id: string | null): Promise<AdminBodyShape | null> {
  if (!id) {
    return null;
  }
  const [row] = await db.select().from(bodyShapes).where(eq(bodyShapes.id, id));
  return row ? toAdminBodyShape(row) : null;
}

export async function assertBodyShapeExists(id: string): Promise<void> {
  const [row] = await db.select({id: bodyShapes.id}).from(bodyShapes).where(eq(bodyShapes.id, id));
  if (!row) {
    throw new Error("The selected body could not be found. Refresh and try again.");
  }
}

export async function createBodyShape(formData: FormData): Promise<AdminBodyShape> {
  const parsed = bodyShapeInputSchema.parse({
    name: formData.get("name"),
    shapeType: formData.get("shapeType"),
    widthCm: parseNumberField(formData, "widthCm"),
    widthBottomCm: parseNumberField(formData, "widthBottomCm"),
    heightCm: parseNumberField(formData, "heightCm"),
    depthCm: parseNumberField(formData, "depthCm"),
    diameterCm: parseNumberField(formData, "diameterCm"),
    thicknessCm: parseNumberField(formData, "thicknessCm"),
    inStock: formData.get("inStock") ?? undefined,
    notes: formData.get("notes") || undefined
  });

  const [row] = await db
    .insert(bodyShapes)
    .values({
      name: parsed.name,
      shapeType: parsed.shapeType,
      widthCm: parsed.widthCm ?? null,
      widthBottomCm: parsed.widthBottomCm ?? null,
      heightCm: parsed.heightCm ?? null,
      depthCm: parsed.depthCm ?? null,
      diameterCm: parsed.diameterCm ?? null,
      thicknessCm: parsed.thicknessCm ?? null,
      inStock: parsed.inStock ?? true,
      notes: parsed.notes ?? null
    })
    .returning();

  return toAdminBodyShape(row);
}

export async function updateBodyShape(id: string, formData: FormData): Promise<AdminBodyShape> {
  const [existing] = await db.select().from(bodyShapes).where(eq(bodyShapes.id, id));
  if (!existing) {
    throw new Error("Body shape not found.");
  }

  const raw: Record<string, unknown> = {};
  if (formData.has("name")) raw.name = formData.get("name");
  if (formData.has("shapeType")) raw.shapeType = formData.get("shapeType");
  if (formData.has("widthCm")) raw.widthCm = parseNumberField(formData, "widthCm");
  if (formData.has("widthBottomCm")) raw.widthBottomCm = parseNumberField(formData, "widthBottomCm");
  if (formData.has("heightCm")) raw.heightCm = parseNumberField(formData, "heightCm");
  if (formData.has("depthCm")) raw.depthCm = parseNumberField(formData, "depthCm");
  if (formData.has("diameterCm")) raw.diameterCm = parseNumberField(formData, "diameterCm");
  if (formData.has("thicknessCm")) raw.thicknessCm = parseNumberField(formData, "thicknessCm");
  if (formData.has("inStock")) raw.inStock = formData.get("inStock");
  if (formData.has("notes")) raw.notes = formData.get("notes") || undefined;

  const parsed = bodyShapeUpdateSchema.parse(raw);

  const [row] = await db
    .update(bodyShapes)
    .set({
      ...(parsed.name !== undefined ? {name: parsed.name} : {}),
      ...(parsed.shapeType !== undefined ? {shapeType: parsed.shapeType} : {}),
      ...(formData.has("widthCm") ? {widthCm: parsed.widthCm ?? null} : {}),
      ...(formData.has("widthBottomCm") ? {widthBottomCm: parsed.widthBottomCm ?? null} : {}),
      ...(formData.has("heightCm") ? {heightCm: parsed.heightCm ?? null} : {}),
      ...(formData.has("depthCm") ? {depthCm: parsed.depthCm ?? null} : {}),
      ...(formData.has("diameterCm") ? {diameterCm: parsed.diameterCm ?? null} : {}),
      ...(formData.has("thicknessCm") ? {thicknessCm: parsed.thicknessCm ?? null} : {}),
      ...(parsed.inStock !== undefined ? {inStock: parsed.inStock} : {}),
      ...(formData.has("notes") ? {notes: parsed.notes ?? null} : {}),
      updatedAt: new Date()
    })
    .where(eq(bodyShapes.id, id))
    .returning();

  return toAdminBodyShape(row);
}

export async function setBodyShapeArchived(id: string, isArchived: boolean): Promise<AdminBodyShape> {
  const [row] = await db.update(bodyShapes).set({isArchived, updatedAt: new Date()}).where(eq(bodyShapes.id, id)).returning();
  if (!row) {
    throw new Error("Body shape not found.");
  }
  return toAdminBodyShape(row);
}
