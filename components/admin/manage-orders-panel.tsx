"use client";

import {useCallback, useEffect, useState} from "react";
import {CheckCircle2, Clock} from "lucide-react";
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
  items: AdminOrderItem[];
};

// Color alone never carries the status — every badge pairs a distinct
// background with an icon and the text label itself, so status still reads
// correctly for anyone who can't rely on color.
const statusBadgeStyles: Record<string, string> = {
  pending_transfer: "bg-[#f6ddc9] text-[#8a4a1f]",
  paid: "bg-[#dcead0] text-[#2f5b2b]"
};

function StatusBadge({status}: {status: string}) {
  const label = orderStatusLabels[status] ?? status;
  const style = statusBadgeStyles[status] ?? "bg-[#eee4cd] text-forest-700";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${style}`}>
      {status === "paid" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
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

export function ManageOrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
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

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <h2 className="font-display text-2xl text-forest-900">Orders ({orders.length})</h2>

      {loading ? (
        <p className="py-10 text-center text-sm text-forest-600">Loading orders...</p>
      ) : orders.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
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
                    {order.status === "paid" && order.confirmedByEmail ? (
                      <p className="mt-1.5 text-[11px] leading-tight text-forest-500">
                        by {order.confirmedByEmail}
                        {order.confirmedAt ? (
                          <>
                            <br />
                            {formatDate(order.confirmedAt)}
                          </>
                        ) : null}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-forest-600">{formatDate(order.createdAt)}</td>
                  <td className="py-3 text-right">
                    {order.status === "pending_transfer" ? (
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => markPaid(order)}
                        className="button-lift rounded-full bg-forest-900 px-4 py-2 text-xs font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyId === order.id ? "Marking..." : "Mark as Paid"}
                      </button>
                    ) : null}
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
