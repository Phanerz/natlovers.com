import {NextResponse} from "next/server";
import {deleteOrder, markOrderPaid, setOrderTracking} from "@/lib/orders";
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
// with action: "set_tracking" attaches a courier + tracking number and
// moves the order to fulfilled.
export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  const adminEmail = await requireAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const {id} = await params;
  const body = await request.json().catch(() => null);

  try {
    if (body?.action === "set_tracking") {
      const result = await setOrderTracking(id, String(body.courier ?? ""), String(body.trackingNumber ?? ""));
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

// Permanent delete, for clearing test/junk orders out of the admin list  -
// re-verifies admin server-side same as PATCH. `confirm` must equal the
// order's orderRef, the server-side half of the typed-confirmation gate in
// the admin UI (see removeOrder in manage-orders-panel.tsx).
export async function DELETE(request: Request, {params}: {params: Promise<{id: string}>}) {
  const adminEmail = await requireAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const {id} = await params;
  const body = await request.json().catch(() => null);
  const confirm = typeof body?.confirm === "string" ? body.confirm : null;
  if (!confirm) {
    return NextResponse.json({error: "Missing confirmation."}, {status: 400});
  }

  try {
    const result = await deleteOrder(id, confirm, adminEmail);
    if (!result.ok) {
      if (result.error === "not_found") {
        return NextResponse.json({error: "Order not found."}, {status: 404});
      }
      return NextResponse.json({error: "Confirmation text did not match the order reference."}, {status: 400});
    }
    return NextResponse.json({ok: true});
  } catch (error) {
    console.error("Failed to delete order:", error);
    return NextResponse.json({error: "Could not delete the order. Please try again."}, {status: 500});
  }
}
