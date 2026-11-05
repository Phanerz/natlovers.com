import {CurrencyCode, currencySymbols, normalizeCurrency} from "@/lib/site";

// Formats an amount that is already in the given currency's own units (rupiah, or dollars). No
// conversion happens here: the amount is a price Natlovers set for that currency.
export function formatCurrency(amount: number, currency: CurrencyCode) {
  const code = normalizeCurrency(currency);
  const whole = code === "IDR" || Number.isInteger(amount);
  return (
    currencySymbols[code] +
    new Intl.NumberFormat(code === "IDR" ? "id-ID" : "en-US", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2
    }).format(amount)
  );
}

// A guide only, for amounts that are quoted in rupiah and have no price of their own in dollars
// (a custom commission estimate). Shown with a leading "about" mark so it is never read as a fixed price.
const ESTIMATE_USD_PER_IDR = 0.000064;

export function formatEstimate(amountIdr: number, currency: CurrencyCode) {
  if (normalizeCurrency(currency) === "IDR") return formatCurrency(amountIdr, "IDR");
  const dollars = Math.max(5, Math.round((amountIdr * ESTIMATE_USD_PER_IDR) / 5) * 5);
  return "≈ " + formatCurrency(dollars, "USD");
}

// An order's own total, in the currency it was placed in.
export function formatOrderTotal(order: {currency?: string | null; totalIdr: number; totalUsdCents?: number | null}) {
  return order.currency === "USD" ? formatCurrency((order.totalUsdCents ?? 0) / 100, "USD") : formatCurrency(order.totalIdr, "IDR");
}
