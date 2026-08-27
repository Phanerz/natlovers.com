"use client";

import Image from "next/image";
import {useRouter} from "next/navigation";
import {useMemo, useState} from "react";
import {Mail, MessageCircle, Search, Users} from "lucide-react";
import {CustomerListRow} from "@/lib/customers";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"});
}

// Strips everything but digits, drops a leading trunk "0", and makes sure
// the Indonesian country code is present exactly once  -  handles numbers
// saved as "0812...", "62812...", or "+62 812...." alike.
function toWhatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withoutLeadingZero = digits.startsWith("0") ? digits.slice(1) : digits;
  const withCountryCode = withoutLeadingZero.startsWith("62") ? withoutLeadingZero : `62${withoutLeadingZero}`;
  return `https://wa.me/${withCountryCode}`;
}

function Avatar({name, email, image}: {name: string | null; email: string | null; image: string | null}) {
  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#eee4cd]">
      {image ? (
        <Image src={image} alt="" fill className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-forest-700">
          {(name ?? email ?? "?").charAt(0)}
        </span>
      )}
    </div>
  );
}

export function CustomersDirectory({customers}: {customers: CustomerListRow[]}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return customers;
    }
    return customers.filter(
      (customer) => customer.name?.toLowerCase().includes(term) || customer.email?.toLowerCase().includes(term)
    );
  }, [customers, query]);

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-forest-900">Customers ({customers.length})</h2>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customers..."
            className="w-full rounded-full border border-[#d4c5ab] bg-[#fffdf9] py-2.5 pl-11 pr-4 text-sm text-forest-900 outline-none focus:border-forest-400"
          />
        </div>
      </div>

      {filtered.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500">
                <th className="pb-3 pr-3">Customer</th>
                <th className="pb-3 pr-3">Contact</th>
                <th className="pb-3 pr-3">First Order</th>
                <th className="pb-3 pr-3">Orders</th>
                <th className="pb-3 pr-3">Location</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => router.push(`/mimin/customers/${customer.id}`)}
                  className="cursor-pointer border-t border-[#e7ddc6] transition-colors duration-150 hover:bg-[#f6efdd]"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={customer.name} email={customer.email} image={customer.image} />
                      <span className="font-display text-base text-forest-900">{customer.name ?? "-"}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      {customer.phone ? (
                        <a
                          href={toWhatsAppLink(customer.phone)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`WhatsApp ${customer.phone}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-forest-600 transition-colors duration-150 hover:bg-[#dcead0] hover:text-[#2f5b2b]"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      ) : null}
                      {customer.email ? (
                        <a
                          href={`mailto:${customer.email}`}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Email ${customer.email}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-forest-600 transition-colors duration-150 hover:bg-[#dbe6f2] hover:text-[#2a4a70]"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      ) : null}
                      {!customer.phone && !customer.email ? <span className="text-forest-400">-</span> : null}
                    </div>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-forest-700">
                    {customer.firstOrderAt ? formatDate(customer.firstOrderAt) : <span className="text-forest-400">-</span>}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-forest-700">
                    {customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}
                  </td>
                  <td className="py-3 pr-3 text-forest-700">
                    {customer.city ?? <span className="text-forest-400">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : customers.length ? (
        <p className="py-10 text-center text-sm text-forest-600">No customers match &quot;{query}&quot;.</p>
      ) : (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eee4cd] text-forest-700">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-sm text-forest-600">No customers yet.</p>
        </div>
      )}
    </div>
  );
}
