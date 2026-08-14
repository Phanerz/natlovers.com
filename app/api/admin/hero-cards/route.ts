import {getServerSession} from "next-auth/next";
import {NextRequest, NextResponse} from "next/server";
import {
  createHeroCard,
  deleteHeroCard,
  getActiveHeroCards,
  getAllHeroCardsForAdmin,
  reorderAllHeroCards
} from "@/lib/admin-hero-cards";
import {authOptions, isAdminEmail} from "@/lib/auth";

// Serves live hero-card data to the storefront — must never be served from
// Next's Full Route Cache.
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

// Public: the hero card stack fetches this on every homepage visit for the
// flat, ordered card list. Passing ?scope=all opts into the admin shape
// (adds displayOrder), but only once the caller is confirmed admin.
export async function GET(request: NextRequest) {
  try {
    const scope = new URL(request.url).searchParams.get("scope");
    if (scope === "all" && (await requireAdmin())) {
      const cards = await getAllHeroCardsForAdmin();
      return NextResponse.json(cards);
    }
    const cards = await getActiveHeroCards();
    return NextResponse.json(cards);
  } catch (error) {
    console.error("Failed to read hero cards:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  try {
    const formData = await request.formData();
    const card = await createHeroCard(formData);
    return NextResponse.json(card, {status: 201});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save hero card.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

// Body carries the full ordered id list, as dropped in the admin panel's
// drag-and-drop list — there's no single-id "move" anymore.
export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  try {
    const body = (await request.json()) as {order?: unknown};
    if (!Array.isArray(body.order) || body.order.some((value) => typeof value !== "string")) {
      return NextResponse.json({error: "Invalid order."}, {status: 400});
    }
    await reorderAllHeroCards(body.order as string[]);
    return NextResponse.json({ok: true});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reorder hero cards.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({error: "Missing id."}, {status: 400});
  }

  await deleteHeroCard(id);
  return NextResponse.json({ok: true});
}
