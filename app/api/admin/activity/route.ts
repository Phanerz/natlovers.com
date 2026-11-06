import {NextRequest, NextResponse} from "next/server";
import {getActivity} from "@/lib/activity";
import {getSession, isAdminEmail} from "@/lib/auth";

export const dynamic = "force-dynamic";

// Recent orders, bags and likes: for one product (?product=slug) or across the whole shop.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  const params = new URL(request.url).searchParams;
  const product = params.get("product")?.trim() || undefined;
  const limit = Number(params.get("limit")) || 20;
  try {
    return NextResponse.json(await getActivity({productSlug: product, limit}));
  } catch (error) {
    console.error("Activity load failed", error);
    return NextResponse.json({error: "Could not load activity."}, {status: 500});
  }
}
