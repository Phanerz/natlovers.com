import {isAdminEmail} from "@/lib/auth";
import {getXenditConfig} from "@/lib/payments/config";
import type {PaymentProvider} from "@/lib/payments/provider";
import {XenditProvider} from "@/lib/payments/xendit";

let override: PaymentProvider | null | undefined;

// Tests swap in a mock. Pass undefined to go back to the real thing.
export function setPaymentProviderForTests(provider: PaymentProvider | null | undefined): void {
  override = provider;
}

// The provider rupiah checkout uses, or null when Xendit is not set up (then checkout falls back to
// manual bank transfer, with no errors).
export function getPaymentProvider(): PaymentProvider | null {
  if (override !== undefined) return override;
  const config = getXenditConfig();
  return config ? new XenditProvider(config) : null;
}

export function onlinePaymentsEnabled(): boolean {
  return getPaymentProvider() !== null;
}

// The provider this particular customer may pay with, or null for the manual bank transfer flow.
// With a test key (test money only) the hosted page is for admins alone: a signed-in user whose
// email is in ADMIN_EMAILS. Everyone else stays on the bank transfer flow, so a real customer can
// never be sent to pay with test money. A live key applies to everyone.
export function getPaymentProviderFor(email: string | null | undefined): PaymentProvider | null {
  const provider = getPaymentProvider();
  if (!provider) return null;
  if (provider.mode === "test" && !isAdminEmail(email)) return null;
  return provider;
}

export function onlinePaymentsEnabledFor(email: string | null | undefined): boolean {
  return getPaymentProviderFor(email) !== null;
}
