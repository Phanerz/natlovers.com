import {getServerSession} from "next-auth/next";
import {NextRequest, NextResponse} from "next/server";
import {createOrder} from "@/lib/orders";
import {authOptions} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const body = await request.json();
  const items = Array.isArray(body?.items)
    ? body.items
        .map((item: {slug?: string; quantity?: number}) => ({
          slug: String(item.slug ?? ""),
          quantity: Number(item.quantity) || 0
        }))
        .filter((item: {slug: string; quantity: number}) => item.slug && item.quantity > 0)
    : [];

  if (!items.length) {
    return NextResponse.json({error: "No items to order."}, {status: 400});
  }

  try {
    const order = await createOrder(userId, items, {
      bankName: process.env.BANK_TRANSFER_BANK_NAME ?? "Bank Central Asia",
      accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME ?? "Natlovers",
      accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER ?? "0000000000"
    });

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
