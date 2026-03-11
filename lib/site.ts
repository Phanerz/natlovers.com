export const locales = ["en", "id"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const currencies = ["IDR", "USD", "GBP", "AUD", "SGD", "MYR"] as const;

export type CurrencyCode = (typeof currencies)[number];

export const defaultCurrency: CurrencyCode = "IDR";

export const exchangeRates: Record<CurrencyCode, number> = {
  IDR: 1,
  USD: 0.000064,
  GBP: 0.00005,
  AUD: 0.000098,
  SGD: 0.000085,
  MYR: 0.0003
};

export const currencySymbols: Record<CurrencyCode, string> = {
  IDR: "Rp",
  USD: "$",
  GBP: "GBP ",
  AUD: "A$",
  SGD: "S$",
  MYR: "RM"
};

export const siteConfig = {
  name: "Natlovers",
  taglineEn: "Art, craft, and heart from Yogyakarta.",
  taglineId: "Seni, kriya, dan hati dari Yogyakarta.",
  descriptionEn:
    "Natlovers is an Indonesian artisan house creating collectible woven handbags and decorative craft objects rooted in storytelling.",
  descriptionId:
    "Natlovers adalah rumah kriya Indonesia yang menghadirkan tas anyam koleksi dan karya dekoratif berbasis cerita."
};