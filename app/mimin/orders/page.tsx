import {ManageOrdersPanel} from "@/components/admin/manage-orders-panel";
import {getSession} from "@/lib/auth";

// Auth is already gated by app/mimin/layout.tsx.
export default async function AdminOrdersPage() {
  const session = await getSession();
  const email = session?.user?.email ?? "";

  return (
    <div className="space-y-6">
      <div>
        <p className="muted">Admin, {email}</p>
        <h1 className="mt-2 font-display text-3xl text-forest-900">Orders</h1>
      </div>

      <ManageOrdersPanel />
    </div>
  );
}
