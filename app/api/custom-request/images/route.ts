import {NextRequest, NextResponse} from "next/server";
import {getSession} from "@/lib/auth";
import {uploadFileWithKey} from "@/lib/blob";
import {assertOwnedRequest, attachImages, removeImage} from "@/lib/custom-requests";
import {ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MB} from "@/lib/upload-limits";

// Inspiration photos for a Custom Studio request. Uploads attach to the
// customer's draft, which the studio page creates before the first upload,
// so a photo is never orphaned in blob storage with no row pointing at it.
export const dynamic = "force-dynamic";

async function requireUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({error: "Sign in to upload inspiration photos."}, {status: 401});
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({error: "Could not read the upload."}, {status: 400});
  }

  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) {
    return NextResponse.json({error: "Missing request id."}, {status: 400});
  }

  // Ownership is checked before anything is written to blob storage, so a
  // request naming someone else's commission never reaches `put`.
  if (!(await assertOwnedRequest(userId, requestId))) {
    return NextResponse.json({error: "Not found."}, {status: 404});
  }

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (!files.length) {
    return NextResponse.json({error: "No images were included."}, {status: 400});
  }

  // Validated up front rather than as each upload is attempted, so a batch
  // containing one oversized file fails cleanly instead of half-uploading.
  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      return NextResponse.json({error: `"${file.name}" isn't a supported image format.`}, {status: 400});
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        {error: `"${file.name}" is larger than ${MAX_IMAGE_MB}MB.`},
        {status: 400}
      );
    }
  }

  try {
    const uploads = await Promise.all(
      files.map(async (file) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
        return uploadFileWithKey(`custom-requests/${requestId}/${Date.now()}-${safeName}`, file);
      })
    );

    const images = await attachImages(requestId, uploads);
    return NextResponse.json({images}, {status: 201});
  } catch (error) {
    console.error("Custom request image upload failed:", error);
    const message = error instanceof Error ? error.message : "Could not upload your images.";
    return NextResponse.json({error: message}, {status: 500});
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId");
  const imageId = url.searchParams.get("imageId");

  if (!requestId || !imageId) {
    return NextResponse.json({error: "Missing request or image id."}, {status: 400});
  }

  // The blob itself is deliberately left in storage. Deleting it here would
  // make removing a photo irreversible the instant it is clicked, and blob
  // cleanup for genuinely abandoned uploads is a separate housekeeping
  // concern — the row is what governs whether the studio ever sees it.
  const removed = await removeImage(userId, requestId, imageId);
  if (!removed) {
    return NextResponse.json({error: "Not found."}, {status: 404});
  }

  return NextResponse.json({ok: true});
}
