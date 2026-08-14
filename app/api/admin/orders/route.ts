import {NextResponse} from "next/server";
import {getAllOrdersAdmin} from "@/lib/orders";
import {getSession, isAdminEmail} from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  try {
    const orders = await getAllOrdersAdmin();
    return NextResponse.json({orders});
  } catch (error) {
    console.error("Failed to load admin orders:", error);
    return NextResponse.json({error: "Could not load orders."}, {status: 500});
  }
}
