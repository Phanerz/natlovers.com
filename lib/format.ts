import {CurrencyCode} from "@/lib/site";
import {currencySymbols, exchangeRates} from "@/lib/site";

export function convertPrice(amountInIdr: number, currency: CurrencyCode) {
  return amountInIdr * exchangeRates[currency];
}

export function formatCurrency(amountInIdr: number, currency: CurrencyCode) {
  const converted = convertPrice(amountInIdr, currency);
  const fractionDigits = currency === "IDR" ? 0 : 2;

  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(converted).replace(/^/, currencySymbols[currency]);
}
