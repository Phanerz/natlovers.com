import {getServerSession} from "next-auth/next";
import {CustomerTelemetryRow} from "@/components/admin/customer-telemetry-row";
import {CustomersDirectory} from "@/components/admin/customers-directory";
import {authOptions} from "@/lib/auth";
import {getCustomerListView, getCustomerTelemetry} from "@/lib/customers";

// Auth is already gated by app/mimin/layout.tsx.
export default async function CustomersPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? "";
  const [telemetry, customers] = await Promise.all([getCustomerTelemetry(), getCustomerListView()]);

  return (
    <div className="space-y-6">
      <div>
        <p className="muted">Admin, {email}</p>
        <h1 className="mt-2 font-display text-3xl text-forest-900">Customers</h1>
      </div>

      <CustomerTelemetryRow telemetry={telemetry} />
      <CustomersDirectory customers={customers} />
    </div>
  );
}
