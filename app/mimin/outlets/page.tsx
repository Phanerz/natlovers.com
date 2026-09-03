import {OutletsAdmin} from "@/components/admin/outlets-admin";
import {getSession} from "@/lib/auth";

// Auth is already gated by app/mimin/layout.tsx.
export default async function AdminOutletsPage() {
  const session = await getSession();
  const email = session?.user?.email ?? "";

  return (
    <div className="space-y-6">
      <div>
        <p className="muted">Admin, {email}</p>
        <h1 className="mt-2 font-display text-3xl text-forest-900">Outlets</h1>
      </div>

      <OutletsAdmin />
    </div>
  );
}
