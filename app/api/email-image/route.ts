import {NextResponse, type NextRequest} from "next/server";
import sharp from "sharp";
import {isAllowedImageHost} from "@/lib/email-images";
import {siteUrl} from "@/lib/email";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;
const PAPER = "#f6efe0";

// A product photo as a small JPEG for email. Mail clients cannot be relied on to show WebP or AVIF.
// Only the shop's own hosts are fetched, and the answer is cached for a year because a stored image
// address never changes its picture.
export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src") ?? "";
  const requested = Number(request.nextUrl.searchParams.get("w") ?? 600);
  const width = Number.isFinite(requested) ? Math.min(600, Math.max(120, Math.round(requested))) : 600;

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return new NextResponse("Not found", {status: 404});
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") return new NextResponse("Not found", {status: 404});
  if (!isAllowedImageHost(target.hostname, new URL(siteUrl()).hostname)) return new NextResponse("Not found", {status: 404});

  try {
    const response = await fetch(target, {signal: AbortSignal.timeout(8000), redirect: "error"});
    const length = Number(response.headers.get("content-length") ?? 0);
    if (!response.ok || length > MAX_BYTES) return new NextResponse("Not found", {status: 404});
    const original = Buffer.from(await response.arrayBuffer());
    if (original.byteLength > MAX_BYTES) return new NextResponse("Not found", {status: 404});
    const jpeg = await sharp(original)
      .rotate()
      .resize({width, withoutEnlargement: true})
      .flatten({background: PAPER})
      .jpeg({quality: 82, mozjpeg: true})
      .toBuffer();
    return new NextResponse(new Uint8Array(jpeg), {
      headers: {"Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable"}
    });
  } catch {
    return new NextResponse("Not found", {status: 404});
  }
}
