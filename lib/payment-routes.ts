import {CurrencyCode, normalizeCurrency} from "@/lib/site";

// Which payment route an order takes follows the currency the customer chose: a rupiah order
// goes the Indonesian way, a dollar order goes the international way. The checkout reads this one
// file, so connecting a real provider to a route later changes only that route.
export type PaymentRoute = "idr_bank_transfer" | "usd_invoice";

export function paymentRouteFor(currency: CurrencyCode): PaymentRoute {
  return normalizeCurrency(currency) === "USD" ? "usd_invoice" : "idr_bank_transfer";
}
