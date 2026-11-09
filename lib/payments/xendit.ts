import type {CreatedPayment, CreatePaymentInput, PaymentProvider, PaymentStatus, ProviderEvent} from "@/lib/payments/provider";
import type {XenditConfig} from "@/lib/payments/config";
import {tokensMatch} from "@/lib/payments/token";

// Xendit Invoice API (hosted payment page). Facts taken from Xendit documentation:
//   - POST https://api.xendit.co/v2/invoices creates an invoice; GET /v2/invoices/{id} reads one.
//   - Basic auth: the secret key as the username, an empty password, Base64 encoded.
//   - Request fields used: external_id, amount, currency, customer.email, success_redirect_url,
//     failure_redirect_url. The response carries invoice_url (the hosted page).
//   - Webhooks carry the account token in the x-callback-token header, and the payload carries id
//     and status ("PAID" when paid). Xendit expects a quick 2xx and retries up to six times.
//   - Xendit current docs list the Invoice API as "legacy" (replacement: Payment Sessions).
//
// NOT confirmed word for word in the docs that could be read, so they are validated strictly below
// and anything unexpected is refused rather than believed: description and invoice_duration in the
// request (listed in Xendit own migration guide), expiry_date in the response, and, in webhook and
// read responses, external_id, amount, paid_amount, currency, paid_at, and the status strings
// SETTLED, EXPIRED and PENDING. A webhook-id header is used as the event id when present.
const BASE_URL = "https://api.xendit.co";

export function mapInvoiceStatus(raw: unknown): PaymentStatus {
  switch (typeof raw === "string" ? raw.toUpperCase() : "") {
    case "PAID":
    case "SETTLED":
      return "paid";
    case "EXPIRED":
      return "expired";
    case "FAILED":
      return "failed";
    default:
      return "pending";
  }
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateOrNull(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Turns an invoice object (a webhook body or a read response) into a ProviderEvent. Null when it
// has no usable id or status.
export function parseInvoice(body: unknown, webhookId: string | null): ProviderEvent | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id ? o.id : null;
  if (!id || typeof o.status !== "string") return null;
  const status = mapInvoiceStatus(o.status);
  return {
    providerRef: id,
    externalId: typeof o.external_id === "string" && o.external_id ? o.external_id : null,
    status,
    amount: numberOrNull(o.amount),
    paidAmount: numberOrNull(o.paid_amount),
    currency: typeof o.currency === "string" ? o.currency.toUpperCase() : null,
    eventId: webhookId || `${id}:${status}`,
    paidAt: dateOrNull(o.paid_at)
  };
}

export class XenditProvider implements PaymentProvider {
  readonly name = "xendit";
  readonly mode: "test" | "live";
  private readonly secretKey: string;
  private readonly callbackToken: string;

  constructor(config: XenditConfig) {
    this.secretKey = config.secretKey;
    this.callbackToken = config.callbackToken;
    this.mode = config.mode;
  }

  private authorization(): string {
    return `Basic ${Buffer.from(`${this.secretKey}:`).toString("base64")}`;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    const response = await fetch(`${BASE_URL}/v2/invoices`, {
      method: "POST",
      headers: {Authorization: this.authorization(), "Content-Type": "application/json"},
      body: JSON.stringify({
        external_id: input.externalId,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        invoice_duration: input.durationSeconds,
        ...(input.customerEmail ? {customer: {email: input.customerEmail}} : {}),
        success_redirect_url: input.successUrl,
        failure_redirect_url: input.failureUrl
      }),
      signal: AbortSignal.timeout(15_000)
    });
    // Only the status is ever surfaced: a body can echo the customer details.
    if (!response.ok) throw new Error(`Xendit create invoice failed with status ${response.status}`);
    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    const id = typeof data?.id === "string" ? data.id : null;
    const url = typeof data?.invoice_url === "string" ? data.invoice_url : null;
    if (!id || !url || !/^https:\/\//.test(url)) throw new Error("Xendit create invoice returned an unexpected answer");
    return {providerRef: id, checkoutUrl: url, expiresAt: dateOrNull(data?.expiry_date)};
  }

  verifyWebhook(headers: Headers): boolean {
    return tokensMatch(headers.get("x-callback-token"), this.callbackToken);
  }

  parseWebhook(headers: Headers, body: unknown): ProviderEvent | null {
    return parseInvoice(body, headers.get("webhook-id"));
  }

  async getPaymentStatus(providerRef: string): Promise<ProviderEvent> {
    const response = await fetch(`${BASE_URL}/v2/invoices/${encodeURIComponent(providerRef)}`, {
      method: "GET",
      headers: {Authorization: this.authorization()},
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error(`Xendit get invoice failed with status ${response.status}`);
    const event = parseInvoice(await response.json().catch(() => null), null);
    // The answer must be about the invoice that was asked for.
    if (!event || event.providerRef !== providerRef) throw new Error("Xendit get invoice returned an unexpected answer");
    return event;
  }
}
