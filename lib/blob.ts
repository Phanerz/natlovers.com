import {put} from "@vercel/blob";
import {MAX_IMAGE_BYTES, MAX_IMAGE_MB} from "@/lib/upload-limits";

// Re-exported so existing server-side importers keep working unchanged
// while lib/upload-limits.ts stays the single definition — client
// components read the same number from there without pulling
// @vercel/blob into the browser bundle.
export {MAX_IMAGE_BYTES};

export function getBlobToken() {
  const token = process.env.NATLOVERS_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("NATLOVERS_READ_WRITE_TOKEN is not set.");
  }
  return token;
}

export async function uploadFile(path: string, file: File): Promise<string> {
  const {url} = await uploadFileWithKey(path, file);
  return url;
}

// Same upload, but also hands back the blob's storage key (its pathname).
// The url alone is enough to display an image but not to manage it later,
// so anything that needs to be able to delete what it uploaded — custom
// request inspiration photos, for instance — stores the key alongside.
export async function uploadFileWithKey(path: string, file: File): Promise<{url: string; storageKey: string}> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image "${file.name}" is too large (max ${MAX_IMAGE_MB}MB).`);
  }
  const blob = await put(path, file, {access: "public", token: getBlobToken()});
  return {url: blob.url, storageKey: blob.pathname};
}
