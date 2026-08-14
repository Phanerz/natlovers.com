import {getServerSession} from "next-auth/next";
import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {AdminSignIn} from "@/components/admin/admin-sign-in";
import {CustomerTelemetryRow} from "@/components/admin/customer-telemetry-row";
import {CustomersDirectory} from "@/components/admin/customers-directory";
import {authOptions, isAdminEmail} from "@/lib/auth";
import {getCustomerListView, getCustomerTelemetry} from "@/lib/customers";

export const metadata = {
  robots: {index: false, follow: false}
};

export default async function AdminCustomersPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const authed = isAdminEmail(email);

  if (!authed || !email) {
    return (
      <main>
        <AdminSignIn />
      </main>
    );
  }

  const [telemetry, customers] = await Promise.all([getCustomerTelemetry(), getCustomerListView()]);

  return (
    <main className="shell py-10 sm:py-16">
      <Link href="/mimin" className="inline-flex items-center gap-2 text-sm font-medium text-forest-700 hover:text-forest-900">
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mb-8 mt-4">
        <p className="muted">Admin, {email}</p>
        <h1 className="mt-2 font-display text-3xl text-forest-900">Customers</h1>
      </div>

      <div className="space-y-6">
        <CustomerTelemetryRow telemetry={telemetry} />
        <CustomersDirectory customers={customers} />
      </div>
    </main>
  );
}
