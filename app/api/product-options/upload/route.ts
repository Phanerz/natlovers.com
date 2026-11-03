import {NextRequest, NextResponse} from "next/server";
import {getSession} from "@/lib/auth";
import {uploadFileWithKey} from "@/lib/blob";
import {ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MB} from "@/lib/upload-limits";

// Reference photos a customer attaches to a product's custom options (a
// photo of their dog, a colour they like). Signed-in only, images only, and
// kept under the customer's own folder; the returned urls travel with the
// cart line and are frozen onto the order for the studio to look at.
export const dynamic = "force-dynamic";

const MAX_FILES_PER_REQUEST = 5;

export async function POST(request: NextRequest) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Sign in to upload reference photos."}, {status: 401});
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({error: "Could not read the upload."}, {status: 400});
  }

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (!files.length) {
    return NextResponse.json({error: "No photos were included."}, {status: 400});
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json({error: `Upload at most ${MAX_FILES_PER_REQUEST} photos at a time.`}, {status: 400});
  }

  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      return NextResponse.json({error: `"${file.name}" isn't a supported image format.`}, {status: 400});
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({error: `"${file.name}" is larger than ${MAX_IMAGE_MB}MB.`}, {status: 400});
    }
  }

  try {
    const uploads = await Promise.all(
      files.map((file) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
        return uploadFileWithKey(`order-references/${userId}/${Date.now()}-${safeName}`, file);
      })
    );
    return NextResponse.json({urls: uploads.map((upload) => upload.url)}, {status: 201});
  } catch (error) {
    console.error("Reference photo upload failed:", error);
    return NextResponse.json({error: "Could not upload your photos. Please try again."}, {status: 500});
  }
}
