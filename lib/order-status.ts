// Human-readable labels for the order.status column, shared by the admin
// orders list and the customer's own order history so both sides describe
// the same status the same way. Kept separate from lib/orders.ts (which
// pulls in the DB client) so client components can import just this.
export const orderStatusLabels: Record<string, string> = {
  pending_transfer: "Awaiting transfer",
  paid: "Paid"
};
