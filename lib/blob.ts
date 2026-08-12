import {put} from "@vercel/blob";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function getBlobToken() {
  const token = process.env.NATLOVERS_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("NATLOVERS_READ_WRITE_TOKEN is not set.");
  }
  return token;
}

export async function uploadFile(path: string, file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image "${file.name}" is too large (max 8MB).`);
  }
  const blob = await put(path, file, {access: "public", token: getBlobToken()});
  return blob.url;
}
