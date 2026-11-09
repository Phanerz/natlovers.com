// Reads the Xendit settings. Names only are ever logged, never values.
export type XenditConfig = {secretKey: string; callbackToken: string; mode: "test" | "live"};

let warned = false;

// Both variables must be set, or the site falls back to the manual bank transfer flow. A test key
// (Xendit test keys start with xnd_development_) works anywhere. Anything else is treated as a live
// key and is refused outside the production deployment, so a live key left in a local file or a
// preview can never take real money by accident.
export function getXenditConfig(env: NodeJS.ProcessEnv = process.env): XenditConfig | null {
  const secretKey = env.XENDIT_SECRET_KEY?.trim();
  const callbackToken = env.XENDIT_CALLBACK_TOKEN?.trim();
  if (!secretKey || !callbackToken) return null;
  const mode = secretKey.startsWith("xnd_development_") ? "test" : "live";
  if (mode === "live" && env.VERCEL_ENV !== "production") {
    if (!warned) {
      warned = true;
      console.error("Xendit is switched off: a live key is set outside the production deployment.");
    }
    return null;
  }
  return {secretKey, callbackToken, mode};
}
