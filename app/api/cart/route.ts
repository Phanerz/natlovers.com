import {NextRequest, NextResponse} from "next/server";
import {z} from "zod";
import {getCartItems, setCartItemQuantity} from "@/lib/cart";
import {getSession} from "@/lib/auth";
import {customConfigSchema} from "@/lib/custom-studio";
import {productSelectionSchema} from "@/lib/product-selection";

const cartConfigSchema = z.union([customConfigSchema, productSelectionSchema]);

export async function GET() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({items: []});
  }

  const items = await getCartItems(userId);
  return NextResponse.json({items});
}

// Upsert: quantity <= 0 removes the line. This is a "set" not an
// "increment"  -  the caller sends the final quantity it wants.
export async function POST(request: NextRequest) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const body = (await request.json()) as {slug?: string; quantity?: number; config?: unknown};
  if (!body.slug || typeof body.quantity !== "number") {
    return NextResponse.json({error: "Missing slug or quantity."}, {status: 400});
  }

  // config is only ever validated, never trusted as-is  -  a malformed value
  // here would otherwise sit silently in the cart line all the way through
  // to an order. A line can carry either a full Custom Studio CustomConfig
  // (from "Customise This Bag") or a plain ProductSelection (size/colour
  // picked directly on the product page)  -  see lib/product-selection.ts.
  let config: z.infer<typeof cartConfigSchema> | null | undefined;
  if (body.config === null) {
    config = null;
  } else if (body.config !== undefined) {
    const parsed = cartConfigSchema.safeParse(body.config);
    if (!parsed.success) {
      return NextResponse.json({error: "Invalid customisation."}, {status: 400});
    }
    config = parsed.data;
  }

  await setCartItemQuantity(userId, body.slug, body.quantity, config);
  const items = await getCartItems(userId);
  return NextResponse.json({items});
}
