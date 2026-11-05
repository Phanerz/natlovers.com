import {NextRequest, NextResponse} from "next/server";
import {getSession, isAdminEmail} from "@/lib/auth";
import {uploadFile} from "@/lib/blob";
import {DEFAULT_DESIGNER_CARD, getDesignerCard, saveDesignerCard} from "@/lib/site-content";

export const dynamic = "force-dynamic";

// Public: the home page reads the card to show it beside the cursor.
export async function GET() {
  try {
    return NextResponse.json(await getDesignerCard());
  } catch (error) {
    console.error("Failed to read the designer card:", error);
    return NextResponse.json(DEFAULT_DESIGNER_CARD);
  }
}

// Admin only: saves the text, and a new portrait if one is sent. Sending removePhoto=true goes back to the default picture.
export async function PUT(request: NextRequest) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!isAdminEmail(email) || !email) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  try {
    const formData = await request.formData();
    const current = await getDesignerCard();
    let photoUrl = current.photoUrl;
    if (formData.get("removePhoto") === "true") {
      photoUrl = "";
    }
    const photo = formData.get("photo");
    if (photo instanceof File && photo.size > 0) {
      const extension = photo.name.includes(".") ? photo.name.split(".").pop() : "jpg";
      photoUrl = await uploadFile(`site/designer-${crypto.randomUUID()}.${extension}`, photo);
    }
    const saved = await saveDesignerCard(
      {
        name: String(formData.get("name") ?? ""),
        roleEn: String(formData.get("roleEn") ?? ""),
        roleId: String(formData.get("roleId") ?? ""),
        aboutEn: String(formData.get("aboutEn") ?? ""),
        aboutId: String(formData.get("aboutId") ?? ""),
        photoUrl
      },
      email
    );
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the card.";
    return NextResponse.json({error: message}, {status: 400});
  }
}
