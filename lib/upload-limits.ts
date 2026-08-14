// The real Vercel Blob upload ceiling, kept in its own dependency-free
// module so client components can show the true limit in their UI without
// importing lib/blob.ts (which pulls in @vercel/blob and its server-side
// token handling). lib/blob.ts re-exports this, so there is still exactly
// one number and the UI can never drift from what the server enforces.
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024);

// Mirrors the accept="image/*" filter the dropzones apply, spelled out so
// the copy under the dropzone names the formats the server will actually
// take rather than a guess.
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const ACCEPTED_IMAGE_LABEL = "JPG, PNG, WEBP";
