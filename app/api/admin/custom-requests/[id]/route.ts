import {NextResponse} from "next/server";
import {getSession, isAdminEmail} from "@/lib/auth";
import {adminUpdateSchema, getCustomRequest, updateCustomRequest} from "@/lib/custom-requests";
import {sendCustomRequestMessage} from "@/lib/custom-notifications";

export const dynamic = "force-dynamic";

async function requireAdminEmail(): Promise<string | null> {
  const session = await getSession();
  const email = session?.user?.email;
  return isAdminEmail(email) && email ? email : null;
}

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!(await requireAdminEmail())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const {id} = await params;
  const request = await getCustomRequest(id);

  if (!request) {
    return NextResponse.json({error: "Not found."}, {status: 404});
  }

  return NextResponse.json({request});
}

// Status changes, the final price, and internal notes all land here. The
// admin check is re-verified server-side rather than trusted from the
// client  -  a hidden button is not a security boundary.
export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!(await requireAdminEmail())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const {id} = await params;
  const body = await request.json().catch(() => null);
  const parsed = adminUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: parsed.error.flatten()}, {status: 400});
  }

  try {
    const updated = await updateCustomRequest(id, parsed.data);
    if (!updated) {
      return NextResponse.json({error: "Not found."}, {status: 404});
    }
    return NextResponse.json({request: updated});
  } catch (error) {
    console.error("Failed to update custom request:", error);
    return NextResponse.json({error: "Could not update the request."}, {status: 500});
  }
}

// Emails the customer through the same Resend account the rest of the app
// uses. Kept as POST on the request rather than a general messaging
// endpoint, so every message sent is anchored to the commission it is about.
export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  if (!(await requireAdminEmail())) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const {id} = await params;
  const body = await request.json().catch(() => null);

  const subject = String(body?.subject ?? "").trim();
  const message = String(body?.message ?? "").trim();

  if (!subject || !message) {
    return NextResponse.json({error: "Both a subject and a message are required."}, {status: 400});
  }

  const target = await getCustomRequest(id);
  if (!target) {
    return NextResponse.json({error: "Not found."}, {status: 404});
  }

  if (!target.customer.email) {
    return NextResponse.json({error: "This customer has no email address on file."}, {status: 400});
  }

  try {
    await sendCustomRequestMessage({
      toEmail: target.customer.email,
      requestRef: target.requestRef ?? "",
      subject,
      message
    });
    return NextResponse.json({ok: true});
  } catch (error) {
    console.error("Failed to email custom request customer:", error);
    const detail = error instanceof Error ? error.message : "Could not send the message.";
    return NextResponse.json({error: detail}, {status: 500});
  }
}
