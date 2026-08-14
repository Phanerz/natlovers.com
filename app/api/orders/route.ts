import {NextResponse} from "next/server";
import {getOrdersForUser} from "@/lib/orders";
import {getSession} from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({orders: []});
  }

  const orders = await getOrdersForUser(userId);
  return NextResponse.json({orders});
}
