import {NextRequest, NextResponse} from "next/server";
import {INVALID_QUANTITY_MESSAGE, isWholeQuantity} from "@/lib/quantity";
import {logFailure} from "@/lib/safe-log";
import {z} from "zod";
import {getCartItems, setCartItemQuantity} from "@/lib/cart";
import {getSession} from "@/lib/auth";
import {checkBagChange} from "@/lib/cart-limits";
import {productSelectionSchema} from "@/lib/product-selection";

const cartConfigSchema = productSelectionSchema;

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
  // 0 removes the line; otherwise a whole number. Anything else is refused calmly, before the database.
  if (!isWholeQuantity(body.quantity, {allowZero: true})) {
    return NextResponse.json({error: "invalid_quantity", message: INVALID_QUANTITY_MESSAGE}, {status: 400});
  }

  // config is only ever validated, never trusted as-is  -  a malformed value
  // here would otherwise sit silently in the cart line all the way through
  // to an order. It must match a ProductSelection (see lib/product-selection.ts).
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

  // The atelier's limits are enforced here, not just in the browser. A refused change leaves the
  // bag exactly as it was, and says which rule was hit so the page can say it in the right words.
  try {
    const verdict = await checkBagChange(userId, body.slug, body.quantity, config);
    if (!verdict.ok) {
      return NextResponse.json(
        {error: "limit", violation: verdict.violation, nextMonth: verdict.nextMonth, items: await getCartItems(userId)},
        {status: 409}
      );
    }
  } catch (error) {
    // If the limits cannot be read (for example the migration has not been run yet), the bag
    // still works; the order itself is checked again, inside a transaction, at checkout.
    logFailure("Bag limit check failed", error);
  }

  await setCartItemQuantity(userId, body.slug, body.quantity, config);
  const items = await getCartItems(userId);
  return NextResponse.json({items});
}
