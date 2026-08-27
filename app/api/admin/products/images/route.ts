import {NextRequest, NextResponse} from "next/server";
import {uploadFile} from "@/lib/blob";
import {getSession, isAdminEmail} from "@/lib/auth";

// Uploads a single product image immediately on add, rather than bundling
// files into the product create/update FormData - this is what lets the
// admin form manage a plain ordered list of URLs (add/remove/reorder/set
// main) instead of juggling a mix of already-uploaded URLs and pending File
// objects across submissions.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({error: "No image file provided."}, {status: 400});
  }

  const slug = formData.get("slug");
  const slugPrefix = typeof slug === "string" && slug.trim() ? slug.trim() : "draft";

  try {
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const url = await uploadFile(`products/${slugPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`, file);
    return NextResponse.json({url});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload image.";
    return NextResponse.json({error: message}, {status: 400});
  }
}
