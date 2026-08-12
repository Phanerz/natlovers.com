import {getServerSession} from "next-auth/next";
import {NextRequest, NextResponse} from "next/server";
import {createProduct, deactivateProduct, getAllProducts, getAllProductsForAdmin, setProductActive, updateProduct} from "@/lib/admin-products";
import {authOptions, isAdminEmail} from "@/lib/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

// Public: the catalogue page fetches this on every visit. It's now the
// single source for the whole product catalogue (no static array merge),
// so admin edits/deactivations show up immediately without a redeploy.
// Passing ?scope=all opts into also seeing deactivated products, but only
// once the caller is confirmed admin, so the storefront never gets that.
export async function GET(request: NextRequest) {
  try {
    const scope = new URL(request.url).searchParams.get("scope");
    const wantsAll = scope === "all" && (await requireAdmin());
    const products = wantsAll ? await getAllProductsForAdmin() : await getAllProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to read products:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  try {
    const formData = await request.formData();
    const product = await createProduct(formData);
    return NextResponse.json(product, {status: 201});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save product.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({error: "Missing slug."}, {status: 400});
  }

  const action = url.searchParams.get("action");

  try {
    if (action === "activate" || action === "deactivate") {
      const product = await setProductActive(slug, action === "activate");
      return NextResponse.json(product);
    }

    const formData = await request.formData();
    const product = await updateProduct(slug, formData);
    return NextResponse.json(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update product.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

// Soft-delete: flips is_active to false instead of removing the row, so
// deactivated products drop out of GET's feed but stay in Postgres.
export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({error: "Missing slug."}, {status: 400});
  }

  await deactivateProduct(slug);
  return NextResponse.json({ok: true});
}
