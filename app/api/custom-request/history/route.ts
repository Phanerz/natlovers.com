import {NextResponse} from "next/server";
import {getSession} from "@/lib/auth";
import {getCustomerRequests} from "@/lib/custom-requests";

// The signed-in customer's own submitted commissions. Drafts are excluded
// by getCustomerRequests — a draft is the studio page's saved state, not
// something the customer thinks of as a request they have made.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({requests: []});
  }

  const requests = await getCustomerRequests(userId);
  return NextResponse.json({requests});
}
