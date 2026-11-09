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
