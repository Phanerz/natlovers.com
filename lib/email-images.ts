// Product photos in emails. Mail clients show JPEG and PNG reliably but not WebP or AVIF, and Gmail
// blocks SVG and base64, so every photo is an absolute https link that serves JPEG or PNG. A JPEG or PNG
// original is linked directly. Anything else goes through /api/email-image, which returns a small
// cached JPEG. Pure functions, so the tests and the preview script can use them.

const DIRECT = /\.(jpe?g|png)$/i;

// Hosts the image route may fetch from. It is not an open proxy.
export function isAllowedImageHost(hostname: string, siteHostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === siteHostname.toLowerCase() || host === "images.unsplash.com" || host.endsWith(".public.blob.vercel-storage.com");
}

// Turns a stored image address (a full https URL or a path on the site) into an absolute address.
function toAbsolute(src: string, baseUrl: string): string | null {
  const value = src.trim();
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return `${baseUrl.replace(/\/$/, "")}${value}`;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

// The address to put in an email's <img>, or null when the stored value is unusable.
export function emailImageUrl(src: string | null | undefined, baseUrl: string, width = 240): string | null {
  if (!src) return null;
  const absolute = toAbsolute(src, baseUrl);
  if (!absolute) return null;
  let pathname = "";
  try {
    pathname = new URL(absolute).pathname;
  } catch {
    return null;
  }
  if (DIRECT.test(pathname)) return absolute;
  return `${baseUrl.replace(/\/$/, "")}/api/email-image?src=${encodeURIComponent(absolute)}&w=${width}`;
}
