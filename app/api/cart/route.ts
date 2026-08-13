import {getServerSession} from "next-auth/next";
import {NextRequest, NextResponse} from "next/server";
import {getCartItems, setCartItemQuantity} from "@/lib/cart";
import {authOptions} from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({items: []});
  }

  const items = await getCartItems(userId);
  return NextResponse.json({items});
}

// Upsert: quantity <= 0 removes the line. This is a "set" not an
// "increment" — the caller sends the final quantity it wants.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const body = (await request.json()) as {slug?: string; quantity?: number};
  if (!body.slug || typeof body.quantity !== "number") {
    return NextResponse.json({error: "Missing slug or quantity."}, {status: 400});
  }

  await setCartItemQuantity(userId, body.slug, body.quantity);
  const items = await getCartItems(userId);
  return NextResponse.json({items});
}
