// What the rest of the site knows about a payment provider. Checkout, the webhook route and the
// reconciliation code speak only this interface, so a provider can be swapped (or mocked in tests)
// without touching them.

export type PaymentStatus = "pending" | "paid" | "expired" | "failed";

export type CreatePaymentInput = {
  // Our own unique reference for this attempt, sent to the provider.
  externalId: string;
  // Whole rupiah. Rupiah has no minor unit.
  amount: number;
  currency: "IDR";
  description: string;
  customerEmail: string | null;
  // How long the hosted page accepts payment, in seconds.
  durationSeconds: number;
  successUrl: string;
  failureUrl: string;
};

export type CreatedPayment = {
  // The provider id for the payment (for Xendit, the invoice id).
  providerRef: string;
  // The hosted page the customer is sent to.
  checkoutUrl: string;
  expiresAt: Date | null;
};

// One thing the provider told us, from a webhook or from asking it directly. Every field that can
// decide whether money moved is checked against our own records before it is believed.
export type ProviderEvent = {
  providerRef: string;
  externalId: string | null;
  status: PaymentStatus;
  amount: number | null;
  paidAmount: number | null;
  currency: string | null;
  // Unique per event where the provider gives one, otherwise a stable stand-in.
  eventId: string;
  paidAt: Date | null;
};

export interface PaymentProvider {
  readonly name: string;
  readonly mode: "test" | "live";
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
  // True only when the request carries the account callback token.
  verifyWebhook(headers: Headers): boolean;
  // Null when the body is not a payment event we understand.
  parseWebhook(headers: Headers, body: unknown): ProviderEvent | null;
  getPaymentStatus(providerRef: string): Promise<ProviderEvent>;
}
