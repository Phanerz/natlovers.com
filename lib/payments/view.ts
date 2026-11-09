// A payment row as the admin screens see it. No provider payloads, no personal data.
export type PaymentView = {
  id: string;
  provider: string;
  providerRef: string | null;
  amount: number;
  currency: string;
  kind: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
};
