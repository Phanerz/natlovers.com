import {getServerSession} from "next-auth/next";
import Image from "next/image";
import {Users} from "lucide-react";
import {getCustomers} from "@/lib/customers";
import {authOptions} from "@/lib/auth";

// Auth is already gated by app/mimin/layout.tsx.
export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? "";
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <div>
        <p className="muted">Admin, {email}</p>
        <h1 className="mt-2 font-display text-3xl text-forest-900">Customers</h1>
      </div>

      <div className="card space-y-5 p-6 sm:p-8">
        <h2 className="font-display text-2xl text-forest-900">All Customers ({customers.length})</h2>

        {customers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500">
                  <th className="pb-3 pr-3">Customer</th>
                  <th className="pb-3 pr-3">Email</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-t border-[#e7ddc6]">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#eee4cd]">
                          {customer.image ? (
                            <Image src={customer.image} alt="" fill className="object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-forest-700">
                              {(customer.name ?? customer.email ?? "?").charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="font-display text-base text-forest-900">{customer.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-forest-700">{customer.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eee4cd] text-forest-700">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-sm text-forest-600">No customers yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
