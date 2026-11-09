import {createHash, timingSafeEqual} from "node:crypto";

// Constant-time comparison. Both sides are hashed first, so the buffers are always the same length
// and the time taken does not reveal how many leading characters were right.
export function tokensMatch(given: string | null | undefined, expected: string): boolean {
  if (!expected || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
