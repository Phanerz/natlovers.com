import {NextRequest, NextResponse} from "next/server";
import {getWishlistSlugs, toggleWishlistItem} from "@/lib/wishlist";
import {getSession} from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({slugs: []});
  }

  const slugs = await getWishlistSlugs(userId);
  return NextResponse.json({slugs});
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const body = (await request.json()) as {slug?: string};
  if (!body.slug) {
    return NextResponse.json({error: "Missing slug."}, {status: 400});
  }

  const result = await toggleWishlistItem(userId, body.slug);
  return NextResponse.json(result);
}
