import {Suspense} from "react";
import {AdminDashboard} from "@/components/admin/admin-dashboard";
import {DaisyLoader} from "@/components/daisy-loader";
import {getSession} from "@/lib/auth";

// Auth is already gated by app/mimin/layout.tsx  -  this only re-reads the
// session to get the email for display. AdminDashboard reads ?tab= via
// useSearchParams, which Next requires a Suspense boundary for.
export default async function AdminPage() {
  const session = await getSession();
  const email = session?.user?.email ?? "";
  const name = session?.user?.name ?? null;

  return (
    <Suspense fallback={<DaisyLoader variant="admin" text="Loading dashboard..." />}>
      <AdminDashboard userEmail={email} userName={name} />
    </Suspense>
  );
}
