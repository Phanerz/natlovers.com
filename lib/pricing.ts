import {CurrencyCode, normalizeCurrency} from "@/lib/site";

// Every product carries two fixed prices set by hand: rupiah and US dollars. These helpers pick
// the one for the chosen currency, so no exchange rate is ever applied to a product.
export type Priced = {
  priceIdr: number;
  priceUsdCents?: number | null;
  compareAtPriceIdr?: number | null;
  compareAtPriceUsdCents?: number | null;
};

// Only used for an old product that has no dollar price yet.
const FALLBACK_USD_PER_IDR = 0.000064;

function roughDollars(amountIdr: number) {
  return Math.max(5, Math.round((amountIdr * FALLBACK_USD_PER_IDR) / 5) * 5);
}

export function unitPrice(product: Priced, currency: CurrencyCode): number {
  if (normalizeCurrency(currency) === "IDR") return product.priceIdr;
  return product.priceUsdCents != null ? product.priceUsdCents / 100 : roughDollars(product.priceIdr);
}

export function compareAtPrice(product: Priced, currency: CurrencyCode): number | null {
  if (normalizeCurrency(currency) === "IDR") return product.compareAtPriceIdr ?? null;
  if (product.compareAtPriceUsdCents != null) return product.compareAtPriceUsdCents / 100;
  return product.compareAtPriceIdr ? roughDollars(product.compareAtPriceIdr) : null;
}

// Add-ons and options (extra dolls, silk lining...) are priced in rupiah. In dollars they scale by this
// product's own rupiah-to-dollar relationship, in whole dollars, so they always agree with its price.
export function extraAmount(product: Priced, extraIdr: number, currency: CurrencyCode): number {
  if (normalizeCurrency(currency) === "IDR") return extraIdr;
  if (extraIdr <= 0) return 0;
  const ratio = product.priceUsdCents != null ? product.priceUsdCents / 100 / product.priceIdr : FALLBACK_USD_PER_IDR;
  return Math.max(1, Math.round(extraIdr * ratio));
}

// The options a shopper chose, each priced in the chosen currency and added up line by line, so the
// total always equals the sum of the amounts shown beside the lines.
export function lineExtrasTotal(product: Priced, lines: {extraIdr: number}[], currency: CurrencyCode): number {
  return lines.reduce((sum, line) => sum + extraAmount(product, line.extraIdr, currency), 0);
}

export function lineUnitPrice(product: Priced, lines: {extraIdr: number}[], currency: CurrencyCode): number {
  return unitPrice(product, currency) + lineExtrasTotal(product, lines, currency);
}
