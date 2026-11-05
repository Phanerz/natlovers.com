export const locales = ["en", "id"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Two currencies, each with its own fixed price set by Natlovers: nothing on the site is
// converted at an exchange rate. See lib/pricing.ts.
export const currencies = ["IDR", "USD"] as const;

export type CurrencyCode = (typeof currencies)[number];

export const defaultCurrency: CurrencyCode = "IDR";

export const currencySymbols: Record<CurrencyCode, string> = {
  IDR: "Rp",
  USD: "$"
};

export function normalizeCurrency(value: unknown): CurrencyCode {
  return value === "USD" ? "USD" : "IDR";
}

export const siteConfig = {
  name: "Natlovers",
  taglineEn: "Art, craft, and heart from Yogyakarta.",
  taglineId: "Seni, kriya, dan hati dari Yogyakarta.",
  descriptionEn:
    "Natlovers is an Indonesian artisan house creating collectible woven handbags and decorative craft objects rooted in storytelling.",
  descriptionId:
    "Natlovers adalah rumah kriya Indonesia yang menghadirkan tas anyam koleksi dan karya dekoratif berbasis cerita."
};