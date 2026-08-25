import Image from "next/image";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft, Mail, MapPin, MessageCircle} from "lucide-react";
import {getCustomerDetail} from "@/lib/customers";
import {orderStatusLabels} from "@/lib/order-status";

export const metadata = {
  robots: {index: false, follow: false}
};

function formatIdr(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"});
}

function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {month: "long", year: "numeric"});
}

function toWhatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withoutLeadingZero = digits.startsWith("0") ? digits.slice(1) : digits;
  const withCountryCode = withoutLeadingZero.startsWith("62") ? withoutLeadingZero : `62${withoutLeadingZero}`;
  return `https://wa.me/${withCountryCode}`;
}

const statusBadgeStyles: Record<string, string> = {
  pending_transfer: "bg-[#f6ddc9] text-[#8a4a1f]",
  paid: "bg-[#dcead0] text-[#2f5b2b]",
  fulfilled: "bg-[#dbe6f2] text-[#2a4a70]"
};

function StatusBadge({status}: {status: string}) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeStyles[status] ?? "bg-[#eee4cd] text-forest-700"}`}>
      {orderStatusLabels[status] ?? status}
    </span>
  );
}

// Auth is already gated by app/mimin/layout.tsx.
export default async function AdminCustomerDetailPage({params}: {params: Promise<{customerId: string}>}) {
  const {customerId} = await params;
  const customer = await getCustomerDetail(customerId);
  if (!customer) {
    notFound();
  }

  return (
    <div>
      <Link href="/mimin/customers" className="inline-flex items-center gap-2 text-sm font-medium text-forest-700 hover:text-forest-900">
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#eee4cd]">
            {customer.image ? (
              <Image src={customer.image} alt="" fill className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-lg font-semibold uppercase text-forest-700">
                {(customer.name ?? customer.email ?? "?").charAt(0)}
              </span>
            )}
          </div>
          <div>
            <h1 className="font-display text-3xl text-forest-900">{customer.name ?? "—"}</h1>
            <p className="muted mt-1">
              {customer.firstOrderAt ? `Customer since ${formatMonthYear(customer.firstOrderAt)}` : "No orders yet"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {customer.phone ? (
            <a
              href={toWhatsAppLink(customer.phone)}
              target="_blank"
              rel="noreferrer"
              className="glass-btn-secondary flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-forest-700"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          ) : null}
          {customer.email ? (
            <a
              href={`mailto:${customer.email}`}
              className="glass-btn-secondary flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-forest-700"
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-[#d4c5ab] bg-[#fffaf1] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-500">Total Orders</p>
          <p className="mt-1 font-display text-2xl text-forest-900">{customer.totalOrders}</p>
        </div>
        <div className="rounded-lg border border-[#d4c5ab] bg-[#fffaf1] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-500">Total Spent</p>
          <p className="mt-1 font-display text-2xl text-forest-900">{formatIdr(customer.totalSpentIdr)}</p>
        </div>
        <div className="rounded-lg border border-[#d4c5ab] bg-[#fffaf1] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-500">First Order</p>
          <p className="mt-1 font-display text-2xl text-forest-900">
            {customer.firstOrderAt ? formatDate(customer.firstOrderAt) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-[#d4c5ab] bg-[#fffaf1] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-500">Last Order</p>
          <p className="mt-1 font-display text-2xl text-forest-900">
            {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="card space-y-5 p-6 sm:p-8">
          <h2 className="font-display text-xl text-forest-900">Order History</h2>
          {customer.orders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500">
                    <th className="pb-3 pr-3">Order</th>
                    <th className="pb-3 pr-3">Date</th>
                    <th className="pb-3 pr-3">Items</th>
                    <th className="pb-3 pr-3">Total</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
                    <tr key={order.id} className="border-t border-[#e7ddc6]">
                      <td className="py-3 pr-3">
                        <Link href="/mimin/orders" className="font-display text-base text-forest-900 hover:underline">
                          {order.orderRef}
                        </Link>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap text-forest-600">{formatDate(order.createdAt)}</td>
                      <td className="py-3 pr-3 text-forest-700">{order.itemCount}</td>
                      <td className="py-3 pr-3 whitespace-nowrap text-forest-700">{formatIdr(order.totalIdr)}</td>
                      <td className="py-3">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-forest-600">No orders yet.</p>
          )}
        </div>

        <div className="card space-y-6 p-6 sm:p-8">
          <div>
            <h2 className="font-display text-xl text-forest-900">Customer Information</h2>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-500">Contact</p>
            {customer.phone ? (
              <a
                href={toWhatsAppLink(customer.phone)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-forest-700 hover:text-[#2f5b2b] hover:underline"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                {customer.phone}
              </a>
            ) : null}
            {customer.email ? (
              <a
                href={`mailto:${customer.email}`}
                className="flex items-center gap-2 text-sm text-forest-700 hover:text-[#2a4a70] hover:underline"
              >
                <Mail className="h-4 w-4 shrink-0" />
                {customer.email}
              </a>
            ) : null}
            {!customer.phone && !customer.email ? <p className="text-sm text-forest-400">No contact info on file.</p> : null}
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-500">Address</p>
            {customer.address ? (
              <div className="flex items-start gap-2 text-sm text-forest-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />
                <div className="space-y-0.5">
                  <p className="font-medium text-forest-900">{customer.address.recipientName}</p>
                  <p>{customer.address.street}</p>
                  <p>
                    {customer.address.city}
                    {customer.address.province ? `, ${customer.address.province}` : ""} {customer.address.postalCode}
                  </p>
                  <p>{customer.address.country}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm text-forest-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>No shipping address on file.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
