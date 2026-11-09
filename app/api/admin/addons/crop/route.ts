import {del} from "@vercel/blob";
import {eq} from "drizzle-orm";
import {NextRequest, NextResponse} from "next/server";
import {addonImages, db} from "@/lib/db";
import {getSession, isAdminEmail} from "@/lib/auth";
import {getBlobToken, uploadFileWithKey} from "@/lib/blob";
import {MAX_IMAGE_BYTES, MAX_IMAGE_MB} from "@/lib/upload-limits";

export const dynamic = "force-dynamic";

// Saves a cropped version of a library photo. The browser does the cropping and sends
// the finished square picture; this stores it and points the photo at it. The earlier
// uploaded copy is removed from storage; photos shipped with the site are left alone.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  const formData = await request.formData().catch(() => null);
  const id = formData?.get("id");
  const file = formData?.get("file");
  if (typeof id !== "string" || !id || !(file instanceof File)) {
    return NextResponse.json({error: "A photo and its id are needed."}, {status: 400});
  }
  if (file.type !== "image/jpeg" && file.type !== "image/png" && file.type !== "image/webp") {
    return NextResponse.json({error: "The cropped picture is not a supported image."}, {status: 400});
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({error: `The cropped picture is larger than ${MAX_IMAGE_MB}MB.`}, {status: 400});
  }

  const [row] = await db.select().from(addonImages).where(eq(addonImages.id, id));
  if (!row) {
    return NextResponse.json({error: "That photo no longer exists."}, {status: 404});
  }

  try {
    const stored = await uploadFileWithKey(`addons/${Date.now()}-cropped.jpg`, file);
    await db.update(addonImages).set({url: stored.url, storageKey: stored.storageKey, zoom: 1}).where(eq(addonImages.id, id));
    if (row.storageKey) {
      // Only when no other entry still shows the same uploaded picture.
      const stillUsed = await db.select({id: addonImages.id}).from(addonImages).where(eq(addonImages.url, row.url));
      if (!stillUsed.length) {
        await del(row.url, {token: getBlobToken()}).catch(() => undefined);
      }
    }
    return NextResponse.json({ok: true, url: stored.url});
  } catch (error) {
    console.error("Add-on photo crop failed", error);
    return NextResponse.json({error: "Could not save the cropped photo. Please try again."}, {status: 500});
  }
}
