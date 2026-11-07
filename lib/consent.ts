import type {CurrencyCode} from "@/lib/site";

// What a visitor has chosen about cookies and about where they are. Both choices live in this
// browser's own storage, so the notice is shown once per device and never again until the visitor
// reopens it from the footer. Nothing here is sent anywhere.

export type ConsentPreferences = {
  // Always on: the sign-in, the bag and the visitor's own settings. Not optional.
  necessary: true;
  // Counts one anonymous visit per new device: the country and whether it was a phone or a laptop.
  analytics: boolean;
  // Nothing in the shop uses this today. The switch exists so the answer is already recorded if that changes.
  marketing: boolean;
  // Bump when the categories change, so an old answer is asked again.
  version: number;
  at: string;
};

export const CONSENT_VERSION = 1;
export const CONSENT_KEY = "natlovers-consent";
export const REGION_KEY = "natlovers-region";
export const VISIT_KEY = "natlovers-visit-logged";
export const OPEN_CONSENT_EVENT = "natlovers:open-consent";
export const OPEN_REGION_EVENT = "natlovers:open-region";
export const REGION_CHANGED_EVENT = "natlovers:region-changed";

export function readConsent(): ConsentPreferences | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentPreferences> & {choice?: string};
    // The first version of the notice stored a single choice: "all" meant the anonymous visit count.
    if (parsed.choice === "all" || parsed.choice === "essential") {
      return {necessary: true, analytics: parsed.choice === "all", marketing: false, version: CONSENT_VERSION, at: parsed.at ?? ""};
    }
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") return null;
    if (parsed.version !== CONSENT_VERSION) return null;
    return {necessary: true, analytics: parsed.analytics, marketing: parsed.marketing, version: CONSENT_VERSION, at: parsed.at ?? ""};
  } catch {
    return null;
  }
}

export function saveConsent(choice: {analytics: boolean; marketing: boolean}): ConsentPreferences {
  const value: ConsentPreferences = {
    necessary: true,
    analytics: choice.analytics,
    marketing: choice.marketing,
    version: CONSENT_VERSION,
    at: new Date().toISOString()
  };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked: the notice will simply show again next visit.
  }
  // The server reads this small cookie to decide whether it may count a visit. "all" is kept as the
  // word for "analytics allowed" so the visit counter did not need to change.
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `natlovers_consent=${choice.analytics ? "all" : "essential"}; max-age=31536000; path=/; SameSite=Lax${secure}`;
  return value;
}

export type RegionPreference = {
  country: string;
  currency: CurrencyCode;
  // True once the visitor picked something different from what we detected. A manual choice is
  // never changed automatically.
  manual: boolean;
  at: string;
};

export function readRegion(): RegionPreference | null {
  try {
    const raw = window.localStorage.getItem(REGION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RegionPreference>;
    if (typeof parsed.country !== "string" || !/^[A-Za-z]{2}$/.test(parsed.country)) return null;
    if (parsed.currency !== "IDR" && parsed.currency !== "USD") return null;
    return {country: parsed.country.toUpperCase(), currency: parsed.currency, manual: parsed.manual === true, at: parsed.at ?? ""};
  } catch {
    return null;
  }
}

export function writeRegion(region: Omit<RegionPreference, "at">): RegionPreference {
  const value: RegionPreference = {...region, at: new Date().toISOString()};
  try {
    window.localStorage.setItem(REGION_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked: we will simply ask again next visit.
  }
  return value;
}

// Prices exist in two currencies only: rupiah for Indonesia, US dollars for everywhere else.
export function recommendedCurrency(country: string | null | undefined): CurrencyCode {
  return country?.toUpperCase() === "ID" ? "IDR" : "USD";
}

// The country the visitor's connection comes from, or null when it cannot be told.
export async function detectCountry(): Promise<string | null> {
  try {
    const response = await fetch("/api/geo", {cache: "no-store"});
    if (!response.ok) return null;
    const data = (await response.json()) as {country?: string | null};
    return data.country && /^[A-Za-z]{2}$/.test(data.country) ? data.country.toUpperCase() : null;
  } catch {
    return null;
  }
}

// Counts one anonymous visit for this device, and only if analytics is allowed.
export function logVisitIfAllowed(consent: ConsentPreferences) {
  if (!consent.analytics) return;
  try {
    if (window.localStorage.getItem(VISIT_KEY)) return;
    window.localStorage.setItem(VISIT_KEY, "1");
  } catch {
    return;
  }
  void fetch("/api/visit", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({device: window.innerWidth < 768 ? "phone" : "laptop"})
  }).catch(() => undefined);
}
