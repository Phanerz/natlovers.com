import {getServerSession} from "next-auth/next";
import {NextResponse} from "next/server";
import {markOrderPaid} from "@/lib/orders";
import {authOptions, isAdminEmail} from "@/lib/auth";

// This moves real money status, so the admin check is re-verified here
// server-side rather than trusted from the client — the button being
// hidden from non-admins in the UI is not a security boundary, this is.
export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  const session = await getServerSession(authOptions);
  const adminEmail = session?.user?.email;
  if (!isAdminEmail(adminEmail) || !adminEmail) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const {id} = await params;

  try {
    const result = await markOrderPaid(id, adminEmail);
    if (!result.ok) {
      if (result.error === "not_found") {
        return NextResponse.json({error: "Order not found."}, {status: 404});
      }
      return NextResponse.json({error: "Order isn't awaiting transfer."}, {status: 409});
    }
    return NextResponse.json({order: result.order, alreadyPaid: result.alreadyPaid});
  } catch (error) {
    console.error("Failed to mark order paid:", error);
    return NextResponse.json({error: "Could not update the order. Please try again."}, {status: 500});
  }
}
