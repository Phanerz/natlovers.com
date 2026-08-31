import {NextRequest, NextResponse} from "next/server";
import {createBodyShape, getAllBodyShapesForAdmin, setBodyShapeArchived, updateBodyShape} from "@/lib/admin-body-shapes";
import {getSession, isAdminEmail} from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  return isAdminEmail(session?.user?.email);
}

// Admin-only throughout  -  unlike hero cards/products, body shapes have no
// direct public consumer: a product's assigned body's dimensions travel
// embedded on that product's own admin/public payload (see
// lib/admin-products.ts), not through a separate storefront fetch of this
// catalog.
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  const shapes = await getAllBodyShapesForAdmin();
  return NextResponse.json(shapes);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  try {
    const formData = await request.formData();
    const shape = await createBodyShape(formData);
    return NextResponse.json(shape, {status: 201});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save body shape.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

// ?id=&action=archive|unarchive toggles isArchived; a plain PATCH with a
// body updates the shape's fields, same split as products' own PATCH.
export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({error: "Missing id."}, {status: 400});
  }
  const action = url.searchParams.get("action");

  try {
    if (action === "archive" || action === "unarchive") {
      const shape = await setBodyShapeArchived(id, action === "archive");
      return NextResponse.json(shape);
    }
    const formData = await request.formData();
    const shape = await updateBodyShape(id, formData);
    return NextResponse.json(shape);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update body shape.";
    return NextResponse.json({error: message}, {status: 400});
  }
}
