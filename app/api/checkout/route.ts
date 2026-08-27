import {NextRequest, NextResponse} from "next/server";
import {z} from "zod";
import {addressInputSchema} from "@/lib/addresses";
import {createOrder} from "@/lib/orders";
import {getSession} from "@/lib/auth";
import {customConfigSchema} from "@/lib/custom-studio";
import {productSelectionSchema} from "@/lib/product-selection";

const orderConfigSchema = z.union([customConfigSchema, productSelectionSchema]);

export async function POST(request: NextRequest) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const body = await request.json();
  const items = Array.isArray(body?.items)
    ? body.items
        .map((item: {slug?: string; quantity?: number; config?: unknown}) => {
          // Same rule as the cart route: a config is only ever carried
          // through once it's confirmed to match a real, known shape
          // (either a Custom Studio CustomConfig or a plain
          // ProductSelection), never trusted as opaque client JSON
          // straight into an order record.
          const configResult = item.config != null ? orderConfigSchema.safeParse(item.config) : null;
          return {
            slug: String(item.slug ?? ""),
            quantity: Number(item.quantity) || 0,
            config: configResult?.success ? configResult.data : null
          };
        })
        .filter((item: {slug: string; quantity: number}) => item.slug && item.quantity > 0)
    : [];

  if (!items.length) {
    return NextResponse.json({error: "No items to order."}, {status: 400});
  }

  // A shipping address is required to place an order, not an optional
  // extra  -  this is the fix for the operational gap where addresses were
  // only ever gathered manually over WhatsApp/email with nothing stored.
  const addressResult = addressInputSchema.safeParse(body?.address);
  if (!addressResult.success) {
    return NextResponse.json({error: addressResult.error.issues[0]?.message ?? "A shipping address is required."}, {status: 400});
  }

  try {
    const order = await createOrder(
      userId,
      items,
      {
        bankName: process.env.BANK_TRANSFER_BANK_NAME ?? "Bank Central Asia",
        accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME ?? "Natlovers",
        accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER ?? "0000000000"
      },
      addressResult.data
    );

    return NextResponse.json({
      ok: true,
      orderRef: order.orderRef,
      accountName: order.accountName,
      accountNumber: order.accountNumber,
      bankName: order.bankName,
      items: order.items,
      total: order.totalIdr
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not place the order.";
    return NextResponse.json({error: message}, {status: 400});
  }
}
