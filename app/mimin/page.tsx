import {Suspense} from "react";
import {getServerSession} from "next-auth/next";
import {AdminDashboard} from "@/components/admin/admin-dashboard";
import {authOptions} from "@/lib/auth";

// Auth is already gated by app/mimin/layout.tsx — this only re-reads the
// session to get the email for display. AdminDashboard reads ?tab= via
// useSearchParams, which Next requires a Suspense boundary for.
export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? "";

  return (
    <Suspense fallback={<p className="muted">Loading...</p>}>
      <AdminDashboard userEmail={email} />
    </Suspense>
  );
}
