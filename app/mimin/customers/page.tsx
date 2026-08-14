import {CustomerTelemetryRow} from "@/components/admin/customer-telemetry-row";
import {CustomersByCountryCard} from "@/components/admin/customers-by-country-card";
import {CustomersDirectory} from "@/components/admin/customers-directory";
import {getSession} from "@/lib/auth";
import {getCustomerListView, getCustomerTelemetry, getCustomersByCountry} from "@/lib/customers";

// Auth is already gated by app/mimin/layout.tsx.
export default async function CustomersPage() {
  const session = await getSession();
  const email = session?.user?.email ?? "";
  const [telemetry, customers, byCountry] = await Promise.all([
    getCustomerTelemetry(),
    getCustomerListView(),
    getCustomersByCountry()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="muted">Admin, {email}</p>
        <h1 className="mt-2 font-display text-3xl text-forest-900">Customers</h1>
      </div>

      <CustomerTelemetryRow telemetry={telemetry} />
      <CustomersDirectory customers={customers} />
      <CustomersByCountryCard rows={byCountry} />
    </div>
  );
}
