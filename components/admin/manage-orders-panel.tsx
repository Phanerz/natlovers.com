"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {CheckCircle2, Clock, Truck} from "lucide-react";
import {OrderItemDetails} from "@/components/order-item-details";
import type {AddonOrderLine} from "@/lib/addon-shared";
import {orderStatusLabels} from "@/lib/order-status";
import {DEFAULT_PAGE_SIZE, PageSize, PaginationBar} from "./pagination-bar";
import {formatOrderTotal} from "@/lib/format";
import {Toast, ToastState} from "./toast";
import {useConfirm} from "./use-confirm";

type AdminOrderItem = {slug: string; name: string; priceIdr: number; quantity: number; config?: unknown; addons?: AddonOrderLine[]};

type AdminOrder = {
  id: string;
  orderRef: string;
  status: string;
  totalIdr: number;
  currency?: string;
  totalUsdCents?: number | null;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  confirmedByEmail: string | null;
  confirmedAt: string | null;
  expiresAt: string | null;
  fulfilmentStage: string;
  trackingCourier: string | null;
  trackingNumber: string | null;
  items: AdminOrderItem[];
  payments?: AdminPayment[];
};

type AdminPayment = {
  id: string;
  provider: string;
  providerRef: string | null;
  amount: number;
  currency: string;
  kind: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

// Color alone never carries the status  -  every badge pairs a distinct
// background with an icon and the text label itself, so status still reads
// correctly for anyone who can't rely on color.
const statusBadgeStyles: Record<string, string> = {
  pending_transfer: "bg-[#f6ddc9] text-[#8a4a1f]",
  paid: "bg-[#dcead0] text-[#2f5b2b]",
  fulfilled: "bg-[#dbe6f2] text-[#2a4a70]",
  cancelled: "bg-[#ece7e1] text-[#5a5248]",
  expired: "bg-[#ece7e1] text-[#5a5248]"
};

const statusIcons: Record<string, typeof Clock> = {
  paid: CheckCircle2,
  fulfilled: Truck
};

function StatusBadge({status}: {status: string}) {
  const label = orderStatusLabels[status] ?? status;
  const style = statusBadgeStyles[status] ?? "bg-[#eee4cd] text-forest-700";
  const Icon = statusIcons[status] ?? Clock;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${style}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function formatIdr(value: number) {
  return `Rp${value.toLocaleString("en-GB")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {dateStyle: "medium"});
}

const stageNames: Record<string, string> = {received: "Received", in_atelier: "In the atelier", finishing: "Finishing", shipped: "Shipped"};

// The production stage, separate from payment status. Shipping goes through the tracking form.
function StageControl({
  order,
  busy,
  onChange,
  onShip
}: {
  order: AdminOrder;
  busy: boolean;
  onChange: (stage: string, notify: boolean) => void;
  onShip: () => void;
}) {
  const [notify, setNotify] = useState(true);
  return (
    <div className="mt-2 space-y-1">
      <label className="block text-[11px] text-forest-500">
        Production stage
        <select
          value={order.fulfilmentStage}
          disabled={busy || order.status === "fulfilled"}
          onChange={(event) => (event.target.value === "shipped" ? onShip() : onChange(event.target.value, notify))}
          className="mt-0.5 block w-full rounded-full border border-[#d4c5ab] bg-white px-3 py-1.5 text-xs text-forest-900 outline-none focus:border-forest-400 disabled:opacity-60"
        >
          <option value="received">Received</option>
          <option value="in_atelier">In the atelier</option>
          <option value="finishing">Finishing</option>
          <option value="shipped">Shipped (add tracking)</option>
        </select>
      </label>
      {order.status === "paid" ? (
        <label className="flex items-center gap-1.5 text-[11px] text-forest-600">
          <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} /> Email the customer
        </label>
      ) : null}
    </div>
  );
}

function TrackingForm({order, onSave, saving}: {order: AdminOrder; onSave: (courier: string, tracking: string, notify: boolean) => void; saving: boolean}) {
  const [courier, setCourier] = useState(order.trackingCourier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const [notify, setNotify] = useState(true);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        value={courier}
        onChange={(event) => setCourier(event.target.value)}
        placeholder="Courier (e.g. JNE)"
        className="w-32 rounded-full border border-[#d4c5ab] bg-white px-3 py-1.5 text-xs text-forest-900 outline-none focus:border-forest-400"
      />
      <input
        value={trackingNumber}
        onChange={(event) => setTrackingNumber(event.target.value)}
        placeholder="Tracking number"
        className="w-36 rounded-full border border-[#d4c5ab] bg-white px-3 py-1.5 text-xs text-forest-900 outline-none focus:border-forest-400"
      />
      <label className="flex items-center gap-1.5 text-[11px] text-forest-600">
        <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} /> Email the customer
      </label>
      <button
        type="button"
        disabled={saving || !courier.trim() || !trackingNumber.trim()}
        onClick={() => onSave(courier, trackingNumber, notify)}
        className="glass-btn-primary rounded-full px-3 py-1.5 text-xs font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : order.status === "fulfilled" ? "Update" : "Mark Shipped"}
      </button>
    </div>
  );
}

// Every payment attempt for an order, as the provider has reported it. Read-only: only the provider
// confirmation, or the audited Mark as paid button, ever changes an order status.
function PaymentsSection({order}: {order: AdminOrder}) {
  const rows = order.payments ?? [];
  if (!rows.length) return null;
  const closedButPaid = rows.some((row) => row.status === "paid") && order.status !== "paid" && order.status !== "fulfilled";
  return (
    <div className="mt-2 rounded-lg border border-[#e6dcc8] px-2.5 py-2 text-[11px] leading-snug text-forest-600">
      <p className="font-semibold text-forest-700">Payments</p>
      <ul className="mt-1 space-y-1">
        {rows.map((row) => (
          <li key={row.id}>
            {row.provider} · {row.kind} · {formatIdr(row.amount)} · <strong>{row.status}</strong>
            {row.paidAt ? <> · paid {formatDate(row.paidAt)}</> : null}
            {row.providerRef ? <span className="block break-all text-forest-500">ref {row.providerRef}</span> : null}
          </li>
        ))}
      </ul>
      {closedButPaid ? <p className="mt-1 font-semibold text-[#8a4a1f]">Money was received for an order that is no longer awaiting payment. Check it by hand.</p> : null}
    </div>
  );
}

export function ManageOrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [trackingOpenId, setTrackingOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const {confirm, dialog: confirmDialog} = useConfirm();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/orders", {cache: "no-store"});
      const data: unknown = response.ok ? await response.json().catch(() => ({orders: []})) : {orders: []};
      const list = (data as {orders?: unknown})?.orders;
      setOrders(Array.isArray(list) ? (list as AdminOrder[]) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function markPaid(order: AdminOrder) {
    setBusyId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {method: "PATCH"});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setToast({type: "error", message: data?.error ?? "Could not mark the order as paid."});
        return;
      }
      setToast({type: "success", message: `${order.orderRef} marked as paid.`});
      await loadOrders();
    } catch {
      setToast({type: "error", message: "Could not reach the server. Please try again."});
    } finally {
      setBusyId(null);
    }
  }

  async function saveTracking(order: AdminOrder, courier: string, trackingNumber: string, notify: boolean) {
    setBusyId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({action: "set_tracking", courier, trackingNumber, notify})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setToast({type: "error", message: data?.error ?? "Could not save tracking info."});
        return;
      }
      setToast({type: "success", message: `${order.orderRef} marked shipped.`});
      setTrackingOpenId(null);
      await loadOrders();
    } catch {
      setToast({type: "error", message: "Could not reach the server. Please try again."});
    } finally {
      setBusyId(null);
    }
  }

  async function changeStage(order: AdminOrder, stage: string, notify: boolean) {
    setBusyId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({action: "set_stage", stage, notify})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setToast({type: "error", message: data?.error ?? "Could not change the stage."});
        return;
      }
      setToast({type: "success", message: `${order.orderRef} is now ${stageNames[stage] ?? stage}.`});
      await loadOrders();
    } catch {
      setToast({type: "error", message: "Could not reach the server. Please try again."});
    } finally {
      setBusyId(null);
    }
  }

  async function checkPayment(order: AdminOrder) {
    setBusyId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({action: "check_payment"})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setToast({type: "error", message: data?.error ?? "Could not check the payment."});
        return;
      }
      setToast({type: "success", message: data?.checked ? `Asked the payment provider about ${order.orderRef}.` : `${order.orderRef} has no open online payment to check.`});
      await loadOrders();
    } catch {
      setToast({type: "error", message: "Could not reach the server. Please try again."});
    } finally {
      setBusyId(null);
    }
  }

  async function extendHold(order: AdminOrder) {
    setBusyId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({action: "extend_hold"})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setToast({type: "error", message: data?.error ?? "Could not extend the order."});
        return;
      }
      setToast({type: "success", message: `${order.orderRef} is held for another 72 hours.`});
      await loadOrders();
    } catch {
      setToast({type: "error", message: "Could not reach the server. Please try again."});
    } finally {
      setBusyId(null);
    }
  }

  async function cancelOrder(order: AdminOrder) {
    if (
      !(await confirm({
        title: `Cancel order ${order.orderRef}?`,
        description: "The order is kept in the list as Cancelled, and the places it held are released. This cannot be undone.",
        confirmLabel: "Cancel order",
        tone: "danger"
      }))
    ) {
      return;
    }
    setBusyId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({action: "cancel"})
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setToast({type: "error", message: data?.error ?? "Could not cancel the order."});
        return;
      }
      setToast({type: "success", message: `${order.orderRef} was cancelled.`});
      await loadOrders();
    } catch {
      setToast({type: "error", message: "Could not reach the server. Please try again."});
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => orders.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [orders, currentPage, pageSize]
  );

  function updatePageSize(size: PageSize) {
    setPageSize(size);
    setPage(1);
  }

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <h2 className="font-display text-2xl text-forest-900">Orders ({orders.length})</h2>

      {loading ? (
        <p className="py-10 text-center text-sm text-forest-600">Loading orders...</p>
      ) : pageItems.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500">
                <th className="pb-3 pr-3">Order</th>
                <th className="pb-3 pr-3">Customer</th>
                <th className="pb-3 pr-3">Items</th>
                <th className="pb-3 pr-3">Total</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3 pr-3">Date</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((order) => (
                <tr key={order.id} className="border-t border-[#e7ddc6] align-top">
                  <td className="py-3 pr-3 font-display text-base text-forest-900">{order.orderRef}</td>
                  <td className="py-3 pr-3 text-forest-700">
                    <div>{order.customerName ?? "-"}</div>
                    <div className="text-xs text-forest-500">{order.customerEmail ?? "-"}</div>
                  </td>
                  <td className="py-3 pr-3 text-forest-700">
                    <ul className="space-y-0.5">
                      {order.items.map((item) => (
                        <li key={item.slug}>
                          {item.name} <span className="text-forest-500">×{item.quantity}</span>
                          <OrderItemDetails
                            config={item.config}
                            addons={item.addons}
                            currency={order.currency}
                            formatMoney={formatIdr}
                            className="text-forest-600"
                          />
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-forest-700">
                    {formatOrderTotal(order)}
                    {order.currency === "USD" ? <span className="ml-1.5 rounded-full bg-[#e8efe0] px-2 py-0.5 text-[10px] font-semibold text-forest-700">USD</span> : null}
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={order.status} />
                    {order.status !== "pending_transfer" && order.confirmedByEmail ? (
                      <p className="mt-1.5 text-[11px] leading-tight text-forest-500">
                        confirmed by {order.confirmedByEmail}
                        {order.confirmedAt ? (
                          <>
                            <br />
                            {formatDate(order.confirmedAt)}
                          </>
                        ) : null}
                      </p>
                    ) : null}
                    {order.status === "fulfilled" && order.trackingCourier ? (
                      <p className="mt-1 text-[11px] leading-tight text-forest-600">
                        {order.trackingCourier} · {order.trackingNumber}
                      </p>
                    ) : null}
                    {order.status === "pending_transfer" && order.expiresAt ? (
                      <p className="mt-1.5 text-[11px] leading-tight text-forest-500">held until {new Date(order.expiresAt).toLocaleString("en-GB", {dateStyle: "medium", timeStyle: "short"})}</p>
                    ) : null}
                    <PaymentsSection order={order} />
                    {order.status === "paid" || order.status === "fulfilled" ? (
                      <StageControl order={order} busy={busyId === order.id} onChange={(stage, notify) => changeStage(order, stage, notify)} onShip={() => setTrackingOpenId(order.id)} />
                    ) : null}
                    {(order.status === "paid" || order.status === "fulfilled") && trackingOpenId === order.id ? (
                      <TrackingForm
                        order={order}
                        saving={busyId === order.id}
                        onSave={(courier, trackingNumber, notify) => saveTracking(order, courier, trackingNumber, notify)}
                      />
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-forest-600">{formatDate(order.createdAt)}</td>
                  <td className="py-3 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      {order.status === "pending_transfer" && (order.payments?.length ?? 0) > 0 ? (
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={() => checkPayment(order)}
                          className="rounded-full border border-[#d4c5ab] px-4 py-2 text-xs font-semibold text-forest-700 disabled:opacity-50"
                        >
                          Check payment now
                        </button>
                      ) : null}
                      {order.status === "pending_transfer" ? (
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          title="Manual. Recorded in the audit log with your email."
                          onClick={() => markPaid(order)}
                          className="glass-btn-primary rounded-full px-4 py-2 text-xs font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyId === order.id ? "Marking..." : "Mark as Paid"}
                        </button>
                      ) : null}
                      {(order.status === "paid" || order.status === "fulfilled") && trackingOpenId !== order.id ? (
                        <button
                          type="button"
                          onClick={() => setTrackingOpenId(order.id)}
                          className="rounded-full border border-[#d4c5ab] px-4 py-2 text-xs font-semibold text-forest-700"
                        >
                          {order.status === "fulfilled" ? "Edit tracking" : "Add tracking"}
                        </button>
                      ) : null}
                      {order.status === "pending_transfer" ? (
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={() => extendHold(order)}
                          className="rounded-full border border-[#d4c5ab] px-4 py-2 text-xs font-semibold text-forest-700 disabled:opacity-50"
                        >
                          Extend hold (72 hours)
                        </button>
                      ) : null}
                      {order.status === "pending_transfer" ? (
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={() => cancelOrder(order)}
                          className="text-xs font-medium text-red-700 hover:text-red-900 disabled:opacity-50"
                        >
                          Cancel order
                        </button>
                      ) : order.status === "paid" || order.status === "fulfilled" ? (
                        <div className="text-right">
                          <button type="button" disabled aria-describedby={`cancel-note-${order.id}`} className="text-xs font-medium text-forest-400 opacity-60">
                            Cancel order
                          </button>
                          <p id={`cancel-note-${order.id}`} className="mt-0.5 max-w-[11rem] text-[11px] leading-tight text-forest-500">
                            A paid order cannot be cancelled here.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : orders.length ? (
        <p className="py-10 text-center text-sm text-forest-600">No orders on this page.</p>
      ) : (
        <p className="py-10 text-center text-sm text-forest-600">No orders yet.</p>
      )}

      {orders.length ? (
        <PaginationBar
          page={currentPage}
          totalPages={totalPages}
          totalItems={orders.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={updatePageSize}
        />
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
      {confirmDialog}
    </div>
  );
}
