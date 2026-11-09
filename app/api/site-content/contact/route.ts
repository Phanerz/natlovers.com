import {NextRequest, NextResponse} from "next/server";
import {getSession, isAdminEmail} from "@/lib/auth";
import {DEFAULT_CONTACT, type ContactSettings} from "@/lib/studio-contact";
import {getContactSettings, saveContactSettings} from "@/lib/site-content";

export const dynamic = "force-dynamic";

// Public: the footer, account page and policy pages show these.
export async function GET() {
  try {
    return NextResponse.json(await getContactSettings());
  } catch {
    return NextResponse.json(DEFAULT_CONTACT);
  }
}

// Admin only.
export async function PUT(request: NextRequest) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!isAdminEmail(email) || !email) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  try {
    const body = (await request.json()) as ContactSettings;
    return NextResponse.json(await saveContactSettings(body, email));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the contact details.";
    return NextResponse.json({error: message}, {status: 400});
  }
}
