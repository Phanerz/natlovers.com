import {NextRequest, NextResponse} from "next/server";
import {addonImages, db} from "@/lib/db";
import {getSession, isAdminEmail} from "@/lib/auth";
import {uploadFileWithKey} from "@/lib/blob";
import {ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MB} from "@/lib/upload-limits";

export const dynamic = "force-dynamic";

// Admin uploads reference photos for the add-on library. They land unassigned
// (or on the species named in the form) and are placed by hand afterwards.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  const formData = await request.formData().catch(() => null);
  const files = formData?.getAll("files").filter((entry): entry is File => entry instanceof File) ?? [];
  if (!files.length) {
    return NextResponse.json({error: "No photos were included."}, {status: 400});
  }
  if (files.length > 10) {
    return NextResponse.json({error: "Upload at most 10 photos at a time."}, {status: 400});
  }
  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      return NextResponse.json({error: `"${file.name}" is not a supported image format.`}, {status: 400});
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({error: `"${file.name}" is larger than ${MAX_IMAGE_MB}MB.`}, {status: 400});
    }
  }
  const speciesIdRaw = formData?.get("speciesId");
  const speciesId = typeof speciesIdRaw === "string" && speciesIdRaw ? speciesIdRaw : null;

  try {
    const uploads = await Promise.all(
      files.map((file) => uploadFileWithKey(`addons/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-")}`, file))
    );
    await db.insert(addonImages).values(
      uploads.map((upload, index) => ({url: upload.url, storageKey: upload.storageKey, speciesId, caption: files[index].name, sortOrder: 1000 + index}))
    );
    return NextResponse.json({ok: true}, {status: 201});
  } catch (error) {
    console.error("Add-on photo upload failed", error);
    return NextResponse.json({error: "Could not upload the photos. Please try again."}, {status: 500});
  }
}
