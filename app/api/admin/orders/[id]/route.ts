import {NextResponse} from "next/server";
import {cancelOrder, extendOrderHold, markOrderPaid, setFulfilmentStage, setOrderTracking} from "@/lib/orders";
import {isFulfilmentStage} from "@/lib/atelier-limits";
import {getSession, isAdminEmail} from "@/lib/auth";

async function requireAdminEmail(): Promise<string | null> {
  const session = await getSession();
  const email = session?.user?.email;
  return isAdminEmail(email) && email ? email : null;
}

// This moves real money status, so the admin check is re-verified here
// server-side rather than trusted from the client  -  the button being
// hidden from non-admins in the UI is not a security boundary, this is.
// No body = mark_paid (Stop 1's original contract, kept working); a body
// with action "set_tracking" attaches a courier + tracking number and moves the order to shipped,
// "set_stage" moves the production stage, and "cancel" cancels an order still awaiting transfer.
export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  const adminEmail = await requireAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const {id} = await params;
  const body = await request.json().catch(() => null);

  try {
    if (body?.action === "set_tracking") {
      const result = await setOrderTracking(id, String(body.courier ?? ""), String(body.trackingNumber ?? ""), body.notify === true);
      if (!result.ok) {
        if (result.error === "not_found") {
          return NextResponse.json({error: "Order not found."}, {status: 404});
        }
        if (result.error === "missing_fields") {
          return NextResponse.json({error: "Courier and tracking number are required."}, {status: 400});
        }
        return NextResponse.json({error: "Order must be paid before it can be shipped."}, {status: 409});
      }
      return NextResponse.json({order: result.order});
    }

    if (body?.action === "set_stage") {
      if (!isFulfilmentStage(body.stage)) {
        return NextResponse.json({error: "Unknown production stage."}, {status: 400});
      }
      const result = await setFulfilmentStage(id, body.stage, body.notify === true);
      if (!result.ok) {
        if (result.error === "not_found") {
          return NextResponse.json({error: "Order not found."}, {status: 404});
        }
        if (result.error === "invalid_stage") {
          return NextResponse.json({error: "Add a courier and tracking number to mark an order as shipped."}, {status: 400});
        }
        return NextResponse.json({error: "Only a paid order has a production stage."}, {status: 409});
      }
      return NextResponse.json({order: result.order});
    }

    if (body?.action === "extend_hold") {
      const result = await extendOrderHold(id);
      if (!result.ok) {
        if (result.error === "not_found") {
          return NextResponse.json({error: "Order not found."}, {status: 404});
        }
        return NextResponse.json({error: "Only an order awaiting payment can be extended."}, {status: 409});
      }
      return NextResponse.json({order: result.order});
    }

    if (body?.action === "cancel") {
      const result = await cancelOrder(id, adminEmail);
      if (!result.ok) {
        if (result.error === "not_found") {
          return NextResponse.json({error: "Order not found."}, {status: 404});
        }
        return NextResponse.json({error: "Only an order awaiting transfer can be cancelled."}, {status: 409});
      }
      return NextResponse.json({order: result.order, alreadyCancelled: result.alreadyCancelled});
    }

    if (body && body.action !== undefined && body.action !== "mark_paid") {
      return NextResponse.json({error: "Unknown action."}, {status: 400});
    }

    const result = await markOrderPaid(id, adminEmail);
    if (!result.ok) {
      if (result.error === "not_found") {
        return NextResponse.json({error: "Order not found."}, {status: 404});
      }
      return NextResponse.json({error: "Order isn't awaiting transfer."}, {status: 409});
    }
    return NextResponse.json({order: result.order, alreadyPaid: result.alreadyPaid});
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({error: "Could not update the order. Please try again."}, {status: 500});
  }
}
