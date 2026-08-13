import {getServerSession} from "next-auth/next";
import {NextRequest, NextResponse} from "next/server";
import {
  createTestimonialGroup,
  deleteTestimonialGroup,
  getActiveTestimonialCards,
  getAllGroupsForAdmin,
  reorderTestimonialGroup,
  setTestimonialGroupActive,
  updateTestimonialGroup
} from "@/lib/admin-testimonials";
import {authOptions, isAdminEmail} from "@/lib/auth";

// Serves live testimonial data to the storefront — must never be served
// from Next's Full Route Cache.
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

// Public: the hero deck fetches this on every homepage visit for the flat,
// active-only card list. Passing ?scope=all opts into the grouped admin
// shape, but only once the caller is confirmed admin.
export async function GET(request: NextRequest) {
  try {
    const scope = new URL(request.url).searchParams.get("scope");
    if (scope === "all" && (await requireAdmin())) {
      const groups = await getAllGroupsForAdmin();
      return NextResponse.json(groups);
    }
    const cards = await getActiveTestimonialCards();
    return NextResponse.json(cards);
  } catch (error) {
    console.error("Failed to read testimonial cards:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  try {
    const formData = await request.formData();
    const group = await createTestimonialGroup(formData);
    return NextResponse.json(group, {status: 201});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save testimonial group.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const url = new URL(request.url);
  const groupId = url.searchParams.get("groupId");
  if (!groupId) {
    return NextResponse.json({error: "Missing groupId."}, {status: 400});
  }

  const action = url.searchParams.get("action");

  try {
    if (action === "activate" || action === "deactivate") {
      const group = await setTestimonialGroupActive(groupId, action === "activate");
      return NextResponse.json(group);
    }

    if (action === "reorder") {
      const body = (await request.json()) as {direction?: "up" | "down"};
      if (body.direction !== "up" && body.direction !== "down") {
        return NextResponse.json({error: "Invalid direction."}, {status: 400});
      }
      await reorderTestimonialGroup(groupId, body.direction);
      return NextResponse.json({ok: true});
    }

    const formData = await request.formData();
    const group = await updateTestimonialGroup(groupId, formData);
    return NextResponse.json(group);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update testimonial group.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

// Permanent delete: removes all rows in the group (not a soft-hide — use
// ?action=deactivate for that instead).
export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const groupId = new URL(request.url).searchParams.get("groupId");
  if (!groupId) {
    return NextResponse.json({error: "Missing groupId."}, {status: 400});
  }

  await deleteTestimonialGroup(groupId);
  return NextResponse.json({ok: true});
}
