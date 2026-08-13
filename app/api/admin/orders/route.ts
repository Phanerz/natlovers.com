import {getServerSession} from "next-auth/next";
import {NextResponse} from "next/server";
import {getAllOrdersAdmin} from "@/lib/orders";
import {authOptions, isAdminEmail} from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
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
