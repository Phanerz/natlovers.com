"use client";

import {useCallback, useEffect, useState} from "react";
import {CheckCircle2, Clock, Truck} from "lucide-react";
import {orderStatusLabels} from "@/lib/order-status";
import {Toast, ToastState} from "./toast";

type AdminOrderItem = {slug: string; name: string; priceIdr: number; quantity: number};

type AdminOrder = {
  id: string;
  orderRef: string;
  status: string;
  totalIdr: number;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  confirmedByEmail: string | null;
  confirmedAt: string | null;
  trackingCourier: string | null;
  trackingNumber: string | null;
  items: AdminOrderItem[];
};

// Color alone never carries the status — every badge pairs a distinct
// background with an icon and the text label itself, so status still reads
// correctly for anyone who can't rely on color.
const statusBadgeStyles: Record<string, string> = {
  pending_transfer: "bg-[#f6ddc9] text-[#8a4a1f]",
  paid: "bg-[#dcead0] text-[#2f5b2b]",
  fulfilled: "bg-[#dbe6f2] text-[#2a4a70]"
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
  return `Rp${value.toLocaleString("id-ID")}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {dateStyle: "medium"});
}

function TrackingForm({order, onSave, saving}: {order: AdminOrder; onSave: (courier: string, tracking: string) => void; saving: boolean}) {
  const [courier, setCourier] = useState(order.trackingCourier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");

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
      <button
        type="button"
        disabled={saving || !courier.trim() || !trackingNumber.trim()}
        onClick={() => onSave(courier, trackingNumber)}
        className="glass-btn-primary rounded-full px-3 py-1.5 text-xs font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : order.status === "fulfilled" ? "Update" : "Mark Shipped"}
      </button>
    </div>
  );
}

export function ManageOrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [trackingOpenId, setTrackingOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

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

  async function saveTracking(order: AdminOrder, courier: string, trackingNumber: string) {
    setBusyId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({action: "set_tracking", courier, trackingNumber})
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

  async function removeOrder(order: AdminOrder) {
    if (!window.confirm(`Permanently delete order ${order.orderRef}? This cannot be undone.`)) {
      return;
    }
    setBusyId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {method: "DELETE"});
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setToast({type: "error", message: data?.error ?? "Could not delete the order."});
        return;
      }
      setToast({type: "success", message: `${order.orderRef} was deleted.`});
      await loadOrders();
    } catch {
      setToast({type: "error", message: "Could not reach the server. Please try again."});
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <h2 className="font-display text-2xl text-forest-900">Orders ({orders.length})</h2>

      {loading ? (
        <p className="py-10 text-center text-sm text-forest-600">Loading orders...</p>
      ) : orders.length ? (
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
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[#e7ddc6] align-top">
                  <td className="py-3 pr-3 font-display text-base text-forest-900">{order.orderRef}</td>
                  <td className="py-3 pr-3 text-forest-700">
                    <div>{order.customerName ?? "—"}</div>
                    <div className="text-xs text-forest-500">{order.customerEmail ?? "—"}</div>
                  </td>
                  <td className="py-3 pr-3 text-forest-700">
                    <ul className="space-y-0.5">
                      {order.items.map((item) => (
                        <li key={item.slug}>
                          {item.name} <span className="text-forest-500">×{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-forest-700">{formatIdr(order.totalIdr)}</td>
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
                    {(order.status === "paid" || order.status === "fulfilled") && trackingOpenId === order.id ? (
                      <TrackingForm
                        order={order}
                        saving={busyId === order.id}
                        onSave={(courier, trackingNumber) => saveTracking(order, courier, trackingNumber)}
                      />
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-forest-600">{formatDate(order.createdAt)}</td>
                  <td className="py-3 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      {order.status === "pending_transfer" ? (
                        <button
                          type="button"
                          disabled={busyId === order.id}
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
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => removeOrder(order)}
                        className="text-xs font-medium text-red-700 hover:text-red-900 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-forest-600">No orders yet.</p>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
