import {CurrencyCode, normalizeCurrency} from "@/lib/site";

// Which payment route an order takes follows the currency the customer chose: a rupiah order goes
// the Indonesian way, a dollar order goes the international way (manual invoice).
//
// Rupiah has two ways. With Xendit set up on the server, the customer pays on Xendit hosted page
// (idr_online) and the order marks itself paid. Without it, checkout falls back to the manual bank
// transfer flow (idr_bank_transfer), exactly as before. Whether Xendit is set up is a server fact,
// so the caller passes it in.
export type PaymentRoute = "idr_bank_transfer" | "idr_online" | "usd_invoice";

export function paymentRouteFor(currency: CurrencyCode, options: {online?: boolean} = {}): PaymentRoute {
  if (normalizeCurrency(currency) === "USD") return "usd_invoice";
  return options.online ? "idr_online" : "idr_bank_transfer";
}
