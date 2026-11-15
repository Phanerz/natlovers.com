// How customers reach the studio. Kept apart from the database code so the browser can import it.
// The values shown on the site come from the admin panel (Contact details); these are what shows
// until something is saved.
export type WhatsAppContact = {
  // Who answers on this number, for example "Anita Yan".
  name: string;
  // The number as people read it, for example "+62 812-2697-007".
  number: string;
};

export type ContactSettings = {
  email: string;
  whatsapp: [WhatsAppContact, WhatsAppContact];
  // Optional. Empty until the admin fills them in; emails skip a line that is empty.
  address?: string;
  instagram?: string;
};

// An Instagram handle or profile link, as a profile link. Empty when nothing usable was given.
export function instagramUrl(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return /^https:\/\/(www\.)?instagram\.com\//i.test(raw) ? raw : "";
  const handle = raw.replace(/^@/, "").replace(/^(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? `https://www.instagram.com/${handle}/` : "";
}

export const DEFAULT_CONTACT: ContactSettings = {
  email: "natlovers@gmail.com",
  whatsapp: [
    {name: "Anita Yan", number: "+62 812-2697-007"},
    {name: "Phanuel", number: "+62 811-2500-1888"}
  ]
};

// The number includes its country code, so the digits alone make a working wa.me link.
export function whatsappLink(number: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}`;
}

export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

// A phone number needs a country code and between 8 and 15 digits (the international limit).
export function isPlausibleNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 && /^[+\d][\d\s\-()+]*$/.test(value.trim());
}
