import {NextRequest, NextResponse} from "next/server";
import {
  createBanner,
  deleteBanner,
  getActiveBanners,
  getAllBannersForAdmin,
  reorderBanners,
  setBannerActive,
  updateBanner
} from "@/lib/admin-catalogue-banners";
import {getSession, isAdminEmail} from "@/lib/auth";

// Live catalogue data  -  never served from Next's Full Route Cache.
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getSession();
  return isAdminEmail(session?.user?.email);
}

const unauthorized = () => NextResponse.json({error: "Unauthorized."}, {status: 401});

// Public: the catalogue fetches the active banners (home-page embed). Passing
// ?scope=all returns every banner with its admin fields, admins only.
export async function GET(request: NextRequest) {
  try {
    const scope = new URL(request.url).searchParams.get("scope");
    if (scope === "all") {
      if (!(await requireAdmin())) {
        return unauthorized();
      }
      return NextResponse.json(await getAllBannersForAdmin());
    }
    return NextResponse.json(await getActiveBanners());
  } catch (error) {
    console.error("Failed to read catalogue banners:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return unauthorized();
  }
  try {
    const banner = await createBanner(await request.formData());
    return NextResponse.json(banner, {status: 201});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the banner.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

// ?id=... edits one banner (multipart, image optional).
export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) {
    return unauthorized();
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({error: "Missing id."}, {status: 400});
  }
  try {
    const banner = await updateBanner(id, await request.formData());
    return NextResponse.json(banner);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the banner.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

// JSON body: {order: string[]} reorders everything; {id, isActive} flips one.
export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return unauthorized();
  }
  try {
    const body = (await request.json()) as {order?: unknown; id?: unknown; isActive?: unknown};
    if (Array.isArray(body.order)) {
      if (body.order.some((value) => typeof value !== "string")) {
        return NextResponse.json({error: "Invalid order."}, {status: 400});
      }
      await reorderBanners(body.order as string[]);
      return NextResponse.json({ok: true});
    }
    if (typeof body.id === "string" && typeof body.isActive === "boolean") {
      await setBannerActive(body.id, body.isActive);
      return NextResponse.json({ok: true});
    }
    return NextResponse.json({error: "Invalid request."}, {status: 400});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the banners.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) {
    return unauthorized();
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({error: "Missing id."}, {status: 400});
  }
  await deleteBanner(id);
  return NextResponse.json({ok: true});
}
