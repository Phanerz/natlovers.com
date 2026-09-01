import {NextRequest, NextResponse} from "next/server";
import {bulkDeleteProductsPermanently} from "@/lib/admin-products";
import {getSession, isAdminEmail} from "@/lib/auth";

async function requireAdminEmail(): Promise<string | null> {
  const session = await getSession();
  const email = session?.user?.email;
  return isAdminEmail(email) && email ? email : null;
}

// One transactional bulk delete instead of the admin UI firing N separate
// DELETE requests  -  see bulkDeleteProductsPermanently for why. confirmCount
// must equal slugs.length, the server-side half of the typed-confirmation
// gate (the admin types the number of products being deleted).
export async function POST(request: NextRequest) {
  const adminEmail = await requireAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const body = await request.json().catch(() => null);
  const slugs = Array.isArray(body?.slugs) ? body.slugs.filter((slug: unknown) => typeof slug === "string") : null;
  const confirmCount = Number(body?.confirmCount);
  if (!slugs || !slugs.length || !Number.isFinite(confirmCount)) {
    return NextResponse.json({error: "Missing slugs or confirmation count."}, {status: 400});
  }

  const result = await bulkDeleteProductsPermanently(slugs, confirmCount, adminEmail);
  if (!result.ok) {
    return NextResponse.json({error: "Confirmation count did not match the number of selected products."}, {status: 400});
  }
  return NextResponse.json({ok: true, deletedCount: result.deletedCount});
}
